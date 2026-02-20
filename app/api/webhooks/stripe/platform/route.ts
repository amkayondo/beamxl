import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/server/db";
import { orgs } from "@/server/db/schema";
import { requireStripeClient, requireStripeWebhookSecret } from "@/server/stripe";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  getStripeAccountContext,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
  registerStripeWebhookEvent,
  verifyAndConstructStripeEvent,
} from "@/server/services/stripe-webhook.service";

async function findOrgForPlatformEvent(event: Stripe.Event) {
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    return db.query.orgs.findFirst({
      where: (o, { or, eq }) =>
        or(
          eq(o.stripeSubscriptionId, subscription.id),
          customerId ? eq(o.stripeCustomerId, customerId) : undefined
        ),
    });
  }

  if (
    event.type === "invoice.payment_succeeded" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!customerId && !subscriptionId) {
      return null;
    }

    return db.query.orgs.findFirst({
      where: (o, { or, eq }) =>
        or(
          subscriptionId ? eq(o.stripeSubscriptionId, subscriptionId) : undefined,
          customerId ? eq(o.stripeCustomerId, customerId) : undefined
        ),
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadataOrgId = session.metadata?.orgId ?? session.client_reference_id;
    if (metadataOrgId) {
      return db.query.orgs.findFirst({
        where: (o, { eq }) => eq(o.id, metadataOrgId),
      });
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!customerId) return null;

    return db.query.orgs.findFirst({
      where: (o, { eq }) => eq(o.stripeCustomerId, customerId),
    });
  }

  return null;
}

async function syncSubscriptionToOrg(input: {
  orgId: string;
  subscription: Stripe.Subscription;
}) {
  const customerId =
    typeof input.subscription.customer === "string"
      ? input.subscription.customer
      : input.subscription.customer?.id;

  await db
    .update(orgs)
    .set({
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: input.subscription.id,
      stripeSubscriptionStatus: input.subscription.status,
      stripePriceId: input.subscription.items.data[0]?.price?.id ?? null,
      stripeCurrentPeriodEnd: new Date(input.subscription.current_period_end * 1000),
      stripeSubscriptionUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orgs.id, input.orgId));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let webhookSecret: string;
  try {
    webhookSecret = requireStripeWebhookSecret("platform");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Platform Stripe webhook secret is not configured",
      },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = await verifyAndConstructStripeEvent({
      rawBody,
      signature,
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const accountId = getStripeAccountContext({ event, headers: request.headers });
  const registration = await registerStripeWebhookEvent({
    event,
    provider: "STRIPE",
    eventType: event.type,
    accountId,
    payload: event,
  });

  if (!registration.shouldProcess) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let orgId: string | null = null;

  try {
    const org = await findOrgForPlatformEvent(event);
    orgId = org?.id ?? null;

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (org) {
          await syncSubscriptionToOrg({ orgId: org.id, subscription });
          await writeAuditLog({
            orgId: org.id,
            actorType: "WEBHOOK",
            action: "STRIPE_SUBSCRIPTION_SYNCED",
            entityType: "Organization",
            entityId: org.id,
            after: {
              eventType: event.type,
              subscriptionId: subscription.id,
              status: subscription.status,
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        if (org) {
          await db
            .update(orgs)
            .set({
              stripeSubscriptionStatus:
                event.type === "invoice.payment_succeeded" ? "active" : "past_due",
              stripeSubscriptionUpdatedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(orgs.id, org.id));
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!org || session.mode !== "subscription") {
          break;
        }

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) {
          break;
        }

        const stripe = requireStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await db
          .update(orgs)
          .set({
            stripeCustomerId: customerId ?? org.stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            stripeSubscriptionStatus: subscription.status,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            stripeSubscriptionUpdatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orgs.id, org.id));
        break;
      }

      default:
        break;
    }

    await markStripeWebhookProcessed({ eventId: event.id, orgId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await markStripeWebhookFailed({
      eventId: event.id,
      orgId,
      error,
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
