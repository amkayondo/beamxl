import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/server/db";
import { enqueueReceiptJob } from "@/server/jobs/producers";
import { requireStripeWebhookSecret } from "@/server/stripe";
import { createNotification } from "@/server/services/notification.service";
import { recordPaymentFromWebhook } from "@/server/services/payment.service";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  getStripeAccountContext,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
  registerStripeWebhookEvent,
  verifyAndConstructStripeEvent,
} from "@/server/services/stripe-webhook.service";

function parseInvoiceContext(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      invoiceId: session.metadata?.invoiceId,
      orgId: session.metadata?.orgId,
      providerPaymentId: session.id,
      providerIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      amountMinor: session.amount_total ?? undefined,
      currency: session.currency?.toUpperCase(),
      status: session.payment_status === "paid" ? "SUCCEEDED" : "PENDING",
    } as const;
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      invoiceId: intent.metadata?.invoiceId,
      orgId: intent.metadata?.orgId,
      providerPaymentId: intent.id,
      providerIntentId: intent.id,
      amountMinor: intent.amount_received || intent.amount,
      currency: intent.currency?.toUpperCase(),
      status: "SUCCEEDED",
    } as const;
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      invoiceId: intent.metadata?.invoiceId,
      orgId: intent.metadata?.orgId,
      providerPaymentId: intent.id,
      providerIntentId: intent.id,
      amountMinor: intent.amount,
      currency: intent.currency?.toUpperCase(),
      status: "FAILED",
    } as const;
  }

  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let connectSecret: string;
  try {
    connectSecret = requireStripeWebhookSecret("connect");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe Connect webhook secret is not configured",
      },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = await verifyAndConstructStripeEvent({
      rawBody,
      signature,
      webhookSecret: connectSecret,
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

  let resolvedOrgId: string | null = null;

  try {
    const context = parseInvoiceContext(event);
    if (!context?.invoiceId || !context.orgId) {
      await markStripeWebhookProcessed({ eventId: event.id });
      return NextResponse.json({ ok: true, ignored: true });
    }

    resolvedOrgId = context.orgId;

    const [invoice, stripeIntegration] = await Promise.all([
      db.query.invoices.findFirst({
        where: (i, { and, eq }) =>
          and(eq(i.id, context.invoiceId!), eq(i.orgId, context.orgId!)),
      }),
      db.query.orgIntegrations.findFirst({
        where: (i, { and, eq }) =>
          and(eq(i.orgId, context.orgId!), eq(i.provider, "stripe")),
      }),
    ]);

    if (!invoice) {
      await markStripeWebhookProcessed({ eventId: event.id, orgId: context.orgId });
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (
      accountId &&
      stripeIntegration?.stripeAccountId &&
      stripeIntegration.stripeAccountId !== accountId
    ) {
      throw new Error("Stripe account mismatch for webhook event");
    }

    await recordPaymentFromWebhook({
      orgId: context.orgId,
      invoiceId: context.invoiceId,
      provider: "STRIPE",
      providerPaymentId: context.providerPaymentId,
      providerIntentId: context.providerIntentId,
      amountMinor: context.amountMinor,
      currency: context.currency ?? invoice.currency,
      status: context.status,
      rawPayload: event,
    });

    if (context.status === "SUCCEEDED") {
      await enqueueReceiptJob({
        orgId: invoice.orgId,
        invoiceId: invoice.id,
      });

      const amount = ((context.amountMinor ?? invoice.amountDueMinor) / 100).toLocaleString(
        "en-US",
        {
          style: "currency",
          currency: context.currency ?? invoice.currency,
        }
      );

      await createNotification({
        orgId: invoice.orgId,
        type: "PAYMENT_RECEIVED",
        title: "Payment received",
        body: `Payment of ${amount} received for invoice ${invoice.invoiceNumber}`,
        link: "invoices",
        metadata: {
          invoiceId: invoice.id,
          eventType: event.type,
          eventId: event.id,
        },
      });

      // Placeholder for future message-log trigger fanout.
    }

    await writeAuditLog({
      orgId: invoice.orgId,
      actorType: "WEBHOOK",
      action: "STRIPE_CONNECT_PAYMENT_EVENT_PROCESSED",
      entityType: "Invoice",
      entityId: invoice.id,
      after: {
        eventId: event.id,
        eventType: event.type,
        status: context.status,
        accountId,
      },
    });

    await markStripeWebhookProcessed({ eventId: event.id, orgId: invoice.orgId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await markStripeWebhookFailed({
      eventId: event.id,
      orgId: resolvedOrgId,
      error,
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
