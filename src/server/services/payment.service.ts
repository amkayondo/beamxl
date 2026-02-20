import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { invoices, payments } from "@/server/db/schema";
import { createConnectedInvoiceCheckoutSession } from "@/server/stripe";

export async function createCheckoutForInvoice(input: {
  orgId: string;
  invoiceId: string;
  returnUrl?: string;
}) {
  const [invoice, stripeIntegration] = await Promise.all([
    db.query.invoices.findFirst({
      where: (i, { and, eq }) =>
        and(eq(i.id, input.invoiceId), eq(i.orgId, input.orgId)),
    }),
    db.query.orgIntegrations.findFirst({
      where: (i, { and, eq }) =>
        and(
          eq(i.orgId, input.orgId),
          eq(i.provider, "stripe"),
          eq(i.status, "connected")
        ),
    }),
  ]);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (!stripeIntegration?.stripeAccountId) {
    throw new Error("Stripe is not connected for this organization");
  }

  const outstandingAmount = invoice.amountDueMinor - invoice.amountPaidMinor;
  if (outstandingAmount <= 0) {
    throw new Error("Invoice is already fully paid");
  }

  const session = await createConnectedInvoiceCheckoutSession({
    connectedAccountId: stripeIntegration.stripeAccountId,
    invoiceId: invoice.id,
    orgId: invoice.orgId,
    amountMinor: outstandingAmount,
    currency: invoice.currency,
    lineItemName: `Invoice ${invoice.invoiceNumber}`,
  });

  const providerIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : undefined;

  await db
    .update(invoices)
    .set({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: providerIntentId ?? invoice.stripePaymentIntentId,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));

  await db.insert(payments).values({
    orgId: input.orgId,
    invoiceId: invoice.id,
    provider: "STRIPE",
    providerPaymentId: session.id,
    providerIntentId,
    amountMinor: outstandingAmount,
    currency: invoice.currency,
    status: "INITIATED",
  }).onConflictDoNothing({ target: payments.providerPaymentId });

  if (!session.url) {
    throw new Error("Stripe checkout session URL is missing");
  }

  return {
    checkoutUrl: session.url,
    providerIntentId: providerIntentId ?? session.id,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
  };
}

export async function recordPaymentFromWebhook(input: {
  orgId: string;
  invoiceId: string;
  provider: string;
  providerPaymentId?: string;
  providerIntentId?: string;
  amountMinor?: number;
  currency?: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  rawPayload: unknown;
}) {
  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.id, input.invoiceId), eq(i.orgId, input.orgId)),
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const paymentAmount = input.amountMinor ?? invoice.amountDueMinor;
  const now = new Date();

  const existingPayment =
    input.providerPaymentId || input.providerIntentId
      ? await db.query.payments.findFirst({
          where: (p, { and, eq, or }) =>
            and(
              eq(p.orgId, input.orgId),
              eq(p.invoiceId, invoice.id),
              or(
                input.providerPaymentId
                  ? eq(p.providerPaymentId, input.providerPaymentId)
                  : undefined,
                input.providerIntentId
                  ? eq(p.providerIntentId, input.providerIntentId)
                  : undefined
              )
            ),
        })
      : null;

  const mappedStatus =
    input.status === "SUCCEEDED"
      ? "SUCCEEDED"
      : input.status === "FAILED"
        ? "FAILED"
        : "PENDING";

  if (existingPayment) {
    await db
      .update(payments)
      .set({
        status: mappedStatus,
        paidAt: input.status === "SUCCEEDED" ? now : existingPayment.paidAt,
        amountMinor: paymentAmount,
        currency: input.currency ?? invoice.currency,
        rawPayload: input.rawPayload as Record<string, unknown>,
        updatedAt: now,
      })
      .where(eq(payments.id, existingPayment.id));
  } else {
    await db
      .insert(payments)
      .values({
        orgId: input.orgId,
        invoiceId: invoice.id,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        providerIntentId: input.providerIntentId,
        amountMinor: paymentAmount,
        currency: input.currency ?? invoice.currency,
        status: mappedStatus,
        paidAt: input.status === "SUCCEEDED" ? now : null,
        rawPayload: input.rawPayload as Record<string, unknown>,
      })
      .onConflictDoNothing({ target: payments.providerPaymentId });
  }

  const nextInvoicePatch: Partial<typeof invoices.$inferInsert> = {
    updatedAt: now,
    stripeCheckoutSessionId: input.providerPaymentId?.startsWith("cs_")
      ? input.providerPaymentId
      : invoice.stripeCheckoutSessionId,
    stripePaymentIntentId: input.providerIntentId ?? invoice.stripePaymentIntentId,
  };

  if (input.status === "SUCCEEDED") {
    nextInvoicePatch.status = "PAID";
    nextInvoicePatch.amountPaidMinor = invoice.amountDueMinor;
    nextInvoicePatch.paidAt = now;
  }

  if (input.status === "FAILED") {
    nextInvoicePatch.status = "FAILED";
  }

  await db
    .update(invoices)
    .set(nextInvoicePatch)
    .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));
}
