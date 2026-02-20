import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/server/db";
import { webhookEvents } from "@/server/db/schema";
import { requireStripeClient } from "@/server/stripe";

export async function verifyAndConstructStripeEvent(input: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}) {
  const stripe = requireStripeClient();
  return stripe.webhooks.constructEventAsync(
    input.rawBody,
    input.signature,
    input.webhookSecret
  );
}

export function getStripeAccountContext(input: {
  event: Stripe.Event;
  headers: Headers;
}) {
  return (
    input.event.account ??
    input.headers.get("stripe-account") ??
    input.headers.get("Stripe-Account") ??
    null
  );
}

export function isWebhookEventAlreadyProcessed(event: {
  processedAt: Date | null;
  status: string;
}) {
  return event.processedAt !== null || event.status === "PROCESSED";
}

export function shouldProcessStripeWebhookEvent(
  existing: { processedAt: Date | null; status: string } | null
) {
  if (!existing) return true;
  return !isWebhookEventAlreadyProcessed(existing);
}

export async function registerStripeWebhookEvent(input: {
  event: Stripe.Event;
  provider: "STRIPE";
  eventType: string;
  accountId?: string | null;
  orgId?: string | null;
  payload: unknown;
}) {
  const inserted = await db
    .insert(webhookEvents)
    .values({
      provider: input.provider,
      eventId: input.event.id,
      providerEventId: input.event.id,
      eventType: input.eventType,
      accountId: input.accountId ?? null,
      orgId: input.orgId ?? null,
      signatureVerified: true,
      status: "RECEIVED",
      payload: input.payload as Record<string, unknown>,
    })
    .onConflictDoNothing({
      target: webhookEvents.eventId,
    })
    .returning({ id: webhookEvents.id });

  if (inserted.length > 0) {
    return { duplicate: false, shouldProcess: true, existing: null };
  }

  const existing = await db.query.webhookEvents.findFirst({
    where: (w, { eq }) => eq(w.eventId, input.event.id),
  });

  if (!existing) {
    throw new Error("Unable to register Stripe webhook event");
  }

  return {
    duplicate: true,
    shouldProcess: shouldProcessStripeWebhookEvent(existing),
    existing,
  };
}

export async function markStripeWebhookProcessed(input: {
  eventId: string;
  orgId?: string | null;
}) {
  await db
    .update(webhookEvents)
    .set({
      status: "PROCESSED",
      orgId: input.orgId ?? undefined,
      processedAt: new Date(),
    })
    .where(eq(webhookEvents.eventId, input.eventId));
}

export async function markStripeWebhookFailed(input: {
  eventId: string;
  error: unknown;
  orgId?: string | null;
}) {
  await db
    .update(webhookEvents)
    .set({
      status: "FAILED",
      orgId: input.orgId ?? undefined,
      error: input.error instanceof Error ? input.error.message : String(input.error),
      processedAt: null,
    })
    .where(eq(webhookEvents.eventId, input.eventId));
}

export async function touchStripeWebhookOrgContext(input: {
  eventId: string;
  orgId: string;
}) {
  await db
    .update(webhookEvents)
    .set({ orgId: input.orgId })
    .where(and(eq(webhookEvents.provider, "STRIPE"), eq(webhookEvents.eventId, input.eventId)));
}
