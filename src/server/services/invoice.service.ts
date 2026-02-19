import { and, eq } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";
import { invoices, paymentPlans } from "@/server/db/schema";

function buildInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `INV-${stamp}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
}

export async function generateInvoiceForPlan(input: {
  orgId: string;
  paymentPlanId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const plan = await db.query.paymentPlans.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.id, input.paymentPlanId), eq(p.orgId, input.orgId)),
  });

  if (!plan) {
    throw new Error("Payment plan not found");
  }

  const invoiceId = crypto.randomUUID();
  const payToken = crypto.randomUUID();
  const dueDate = input.periodEnd;

  const payLinkUrl = `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/i/${invoiceId}?token=${payToken}`;

  await db.insert(invoices).values({
    id: invoiceId,
    orgId: input.orgId,
    contactId: plan.contactId,
    paymentPlanId: plan.id,
    invoiceNumber: buildInvoiceNumber(),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dueDate,
    amountDueMinor: plan.amountMinor,
    amountPaidMinor: 0,
    currency: plan.currency,
    status: "SENT",
    publicPayToken: payToken,
    payLinkUrl,
  });

  return {
    invoiceId,
    payLinkUrl,
  };
}

export async function markInvoicePaid(input: {
  orgId: string;
  invoiceId: string;
  amountMinor: number;
}) {
  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.id, input.invoiceId), eq(i.orgId, input.orgId)),
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const paidTotal = invoice.amountPaidMinor + input.amountMinor;
  const paidInFull = paidTotal >= invoice.amountDueMinor;

  await db
    .update(invoices)
    .set({
      amountPaidMinor: paidTotal,
      status: paidInFull ? "PAID" : invoice.status,
      paidAt: paidInFull ? new Date() : invoice.paidAt,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)));

  return {
    paidInFull,
    amountPaidMinor: paidTotal,
  };
}

export async function markOverdueInvoices(orgId: string, onDate: string) {
  await db
    .update(invoices)
    .set({
      status: "OVERDUE",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(invoices.orgId, orgId),
        eq(invoices.status, "DUE"),
        eq(invoices.dueDate, onDate)
      )
    );
}

export async function setInvoiceDueIfSent(input: { orgId: string; invoiceId: string }) {
  await db
    .update(invoices)
    .set({
      status: "DUE",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(invoices.orgId, input.orgId),
        eq(invoices.id, input.invoiceId),
        eq(invoices.status, "SENT")
      )
    );
}

export async function listInvoicesForPlan(input: {
  orgId: string;
  paymentPlanId: string;
}) {
  return db.query.invoices.findMany({
    where: (i, { and, eq }) =>
      and(eq(i.orgId, input.orgId), eq(i.paymentPlanId, input.paymentPlanId)),
  });
}
