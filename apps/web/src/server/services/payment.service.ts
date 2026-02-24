import { and, eq, or } from "drizzle-orm";

import { db } from "@/server/db";
import { invoices, payments } from "@/server/db/schema";
import {
  computeOutstandingMinor,
  markInvoicePaid,
  refreshBundleTotals,
} from "@/server/services/invoice.service";
import { writeAuditLog } from "@/server/services/audit.service";
import { createConnectedInvoiceCheckoutSession } from "@/server/stripe";

export function resolveCheckoutAmountPolicy(input: {
  invoice: typeof invoices.$inferSelect;
  requestedAmountMinor?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const invoice = input.invoice;
  const outstandingAmount = computeOutstandingMinor(invoice);

  if (outstandingAmount <= 0) {
    throw new Error("Invoice is already fully paid");
  }

  if (
    invoice.paymentLinkExpiresAt &&
    now.getTime() > invoice.paymentLinkExpiresAt.getTime()
  ) {
    throw new Error("Payment link has expired");
  }

  if (input.requestedAmountMinor !== undefined) {
    const requested = Math.max(0, input.requestedAmountMinor);

    if (requested <= 0) {
      throw new Error("Checkout amount must be positive");
    }

    if (requested > outstandingAmount) {
      throw new Error("Checkout amount exceeds outstanding balance");
    }

    if (!invoice.allowPartialPayments && requested < outstandingAmount) {
      throw new Error("Partial payments are disabled for this invoice");
    }

    if (invoice.allowPartialPayments && requested < invoice.minimumPartialAmountMinor) {
      throw new Error("Checkout amount is below minimum partial payment");
    }

    return requested;
  }

  const discountEligible =
    invoice.earlyDiscountPercent > 0 &&
    invoice.earlyDiscountExpiresAt !== null &&
    now.getTime() <= invoice.earlyDiscountExpiresAt.getTime() &&
    invoice.amountPaidMinor === 0 &&
    invoice.discountAppliedMinor === 0;

  if (discountEligible) {
    const discountedAmount = Math.max(
      0,
      invoice.amountDueMinor - Math.round((invoice.amountDueMinor * invoice.earlyDiscountPercent) / 100)
    );
    return Math.min(outstandingAmount, discountedAmount);
  }

  return outstandingAmount;
}

export async function createCheckoutForInvoice(input: {
  orgId: string;
  invoiceId: string;
  returnUrl?: string;
  amountMinor?: number;
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

  const chargeAmountMinor = resolveCheckoutAmountPolicy({
    invoice,
    requestedAmountMinor: input.amountMinor,
  });

  const session = await createConnectedInvoiceCheckoutSession({
    connectedAccountId: stripeIntegration.stripeAccountId,
    invoiceId: invoice.id,
    orgId: invoice.orgId,
    amountMinor: chargeAmountMinor,
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

  await db
    .insert(payments)
    .values({
      orgId: input.orgId,
      invoiceId: invoice.id,
      provider: "STRIPE",
      providerPaymentId: session.id,
      providerIntentId,
      amountMinor: chargeAmountMinor,
      currency: invoice.currency,
      status: "INITIATED",
    })
    .onConflictDoNothing({ target: payments.providerPaymentId });

  if (!session.url) {
    throw new Error("Stripe checkout session URL is missing");
  }

  return {
    checkoutUrl: session.url,
    providerIntentId: providerIntentId ?? session.id,
    amountMinor: chargeAmountMinor,
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

  const paymentAmount = input.amountMinor ?? Math.max(0, computeOutstandingMinor(invoice));
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

  const basePatch: Partial<typeof invoices.$inferInsert> = {
    updatedAt: now,
    stripeCheckoutSessionId: input.providerPaymentId?.startsWith("cs_")
      ? input.providerPaymentId
      : invoice.stripeCheckoutSessionId,
    stripePaymentIntentId: input.providerIntentId ?? invoice.stripePaymentIntentId,
  };

  if (input.status === "SUCCEEDED") {
    const alreadyAppliedMinor =
      existingPayment?.status === "SUCCEEDED" ? existingPayment.amountMinor : 0;
    const deltaToApplyMinor = Math.max(paymentAmount - alreadyAppliedMinor, 0);
    const isIdempotentReplay = deltaToApplyMinor === 0;

    let reconciliation:
      | Awaited<ReturnType<typeof markInvoicePaid>>
      | null = null;

    if (deltaToApplyMinor > 0) {
      reconciliation = await markInvoicePaid({
        orgId: input.orgId,
        invoiceId: input.invoiceId,
        amountMinor: deltaToApplyMinor,
      });
    }

    await db
      .update(invoices)
      .set(basePatch)
      .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));

    if (invoice.bundleId) {
      await refreshBundleTotals({
        orgId: invoice.orgId,
        bundleId: invoice.bundleId,
      });
    }

    await writeAuditLog({
      orgId: input.orgId,
      actorType: "WEBHOOK",
      action: "PAYMENT_RECONCILED",
      entityType: "Invoice",
      entityId: invoice.id,
      before: {
        paymentStatus: existingPayment?.status ?? null,
        amountPaidMinor: invoice.amountPaidMinor,
        discountAppliedMinor: invoice.discountAppliedMinor,
      },
      after: {
        provider: input.provider,
        providerPaymentId: input.providerPaymentId ?? null,
        providerIntentId: input.providerIntentId ?? null,
        mappedStatus,
        paymentAmountMinor: paymentAmount,
        deltaToApplyMinor,
        idempotentReplay: isIdempotentReplay,
        reconciledStatus: reconciliation?.status ?? invoice.status,
        reconciledAmountPaidMinor:
          reconciliation?.amountPaidMinor ?? invoice.amountPaidMinor,
        reconciledDiscountAppliedMinor:
          reconciliation?.discountAppliedMinor ?? invoice.discountAppliedMinor,
      },
    });
    return;
  }

  if (input.status === "FAILED") {
    await db
      .update(invoices)
      .set({
        ...basePatch,
        status: invoice.amountPaidMinor > 0 ? "PARTIAL" : "FAILED",
      })
      .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));
    return;
  }

  await db
    .update(invoices)
    .set(basePatch)
    .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));
}
