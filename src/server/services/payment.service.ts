import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { invoices, payments } from "@/server/db/schema";
import { stripePaymentAdapter } from "@/server/adapters/payments/stripe.adapter";

export async function createCheckoutForInvoice(input: {
  orgId: string;
  invoiceId: string;
  returnUrl: string;
}) {
  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.id, input.invoiceId), eq(i.orgId, input.orgId)),
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const checkout = await stripePaymentAdapter.createCheckoutSession({
    invoiceId: invoice.id,
    amountMinor: invoice.amountDueMinor - invoice.amountPaidMinor,
    currency: invoice.currency,
    returnUrl: input.returnUrl,
  });

  await db.insert(payments).values({
    orgId: input.orgId,
    invoiceId: invoice.id,
    provider: stripePaymentAdapter.provider,
    providerIntentId: checkout.providerIntentId,
    amountMinor: invoice.amountDueMinor,
    currency: invoice.currency,
    status: "INITIATED",
  });

  return checkout;
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

  await db.insert(payments).values({
    orgId: input.orgId,
    invoiceId: invoice.id,
    provider: input.provider,
    providerPaymentId: input.providerPaymentId,
    providerIntentId: input.providerIntentId,
    amountMinor: paymentAmount,
    currency: input.currency ?? invoice.currency,
    status:
      input.status === "SUCCEEDED"
        ? "SUCCEEDED"
        : input.status === "FAILED"
          ? "FAILED"
          : "PENDING",
    paidAt: input.status === "SUCCEEDED" ? new Date() : null,
    rawPayload: input.rawPayload as Record<string, unknown>,
  });

  if (input.status === "SUCCEEDED") {
    await db
      .update(invoices)
      .set({
        status: "PAID",
        amountPaidMinor: invoice.amountDueMinor,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));
  }

  if (input.status === "FAILED") {
    await db
      .update(invoices)
      .set({
        status: "FAILED",
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));
  }
}
