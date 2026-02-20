import { and, eq, inArray, lte, sql } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";
import {
  invoiceBundleItems,
  invoiceBundles,
  invoiceRecurringSchedules,
  invoices,
  paymentPlans,
} from "@/server/db/schema";

type InvoiceLike = {
  amountDueMinor: number;
  amountPaidMinor: number;
  discountAppliedMinor: number;
  earlyDiscountPercent: number;
  earlyDiscountExpiresAt: Date | null;
};

function buildInvoiceNumber(prefix = "INV") {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

function buildBundleNumber() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `BND-${stamp}-${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

function payLinkForInvoice(invoiceId: string, token: string) {
  return `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/i/${invoiceId}?token=${token}`;
}

function payLinkForBundle(bundleId: string, token: string) {
  return `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/b/${bundleId}?token=${token}`;
}

function discountAmountMinor(amountDueMinor: number, earlyDiscountPercent: number) {
  if (earlyDiscountPercent <= 0) return 0;
  return Math.round((amountDueMinor * earlyDiscountPercent) / 100);
}

function isDiscountEligible(invoice: InvoiceLike, on = new Date()) {
  return (
    invoice.earlyDiscountPercent > 0 &&
    invoice.earlyDiscountExpiresAt !== null &&
    on.getTime() <= invoice.earlyDiscountExpiresAt.getTime() &&
    invoice.amountPaidMinor === 0 &&
    invoice.discountAppliedMinor === 0
  );
}

export function computeOutstandingMinor(invoice: InvoiceLike) {
  return Math.max(
    invoice.amountDueMinor - invoice.amountPaidMinor - invoice.discountAppliedMinor,
    0
  );
}

export function resolveInvoicePaymentResult(input: {
  invoice: InvoiceLike;
  incomingAmountMinor: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const invoice = input.invoice;

  const incomingAmountMinor = Math.max(0, input.incomingAmountMinor);
  const nextPaidMinor = Math.min(invoice.amountDueMinor, invoice.amountPaidMinor + incomingAmountMinor);

  let discountAppliedMinor = invoice.discountAppliedMinor;
  if (
    isDiscountEligible(invoice, now) &&
    nextPaidMinor < invoice.amountDueMinor &&
    nextPaidMinor >=
      Math.max(
        0,
        invoice.amountDueMinor -
          discountAmountMinor(invoice.amountDueMinor, invoice.earlyDiscountPercent)
      )
  ) {
    discountAppliedMinor = Math.max(0, invoice.amountDueMinor - nextPaidMinor);
  }

  const settledTargetMinor = Math.max(0, invoice.amountDueMinor - discountAppliedMinor);
  const paidInFull = nextPaidMinor >= settledTargetMinor;

  return {
    paidInFull,
    amountPaidMinor: nextPaidMinor,
    discountAppliedMinor,
    status: paidInFull ? ("PAID" as const) : nextPaidMinor > 0 ? ("PARTIAL" as const) : null,
  };
}

export async function createManualInvoice(input: {
  orgId: string;
  contactId: string;
  paymentPlanId?: string | null;
  recurringScheduleId?: string | null;
  invoiceNumber?: string | null;
  periodStart: string;
  periodEnd: string;
  dueDate: Date;
  amountDueMinor: number;
  currency?: string;
  status?: "DRAFT" | "SENT";
  paymentLinkExpiresAt?: Date | null;
  earlyDiscountPercent?: number;
  earlyDiscountExpiresAt?: Date | null;
  allowPartialPayments?: boolean;
  minimumPartialAmountMinor?: number;
}) {
  const invoiceId = crypto.randomUUID();
  const payToken = crypto.randomUUID();

  await db.insert(invoices).values({
    id: invoiceId,
    orgId: input.orgId,
    contactId: input.contactId,
    paymentPlanId: input.paymentPlanId ?? null,
    recurringScheduleId: input.recurringScheduleId ?? null,
    invoiceNumber: input.invoiceNumber ?? buildInvoiceNumber(),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dueDate: input.dueDate,
    amountDueMinor: input.amountDueMinor,
    amountPaidMinor: 0,
    discountAppliedMinor: 0,
    currency: input.currency ?? "USD",
    status: input.status ?? "DRAFT",
    publicPayToken: payToken,
    payLinkUrl: payLinkForInvoice(invoiceId, payToken),
    paymentLinkExpiresAt: input.paymentLinkExpiresAt ?? null,
    earlyDiscountPercent: Math.max(0, input.earlyDiscountPercent ?? 0),
    earlyDiscountExpiresAt: input.earlyDiscountExpiresAt ?? null,
    allowPartialPayments: input.allowPartialPayments ?? false,
    minimumPartialAmountMinor: Math.max(0, input.minimumPartialAmountMinor ?? 0),
  });

  return { invoiceId };
}

export async function updateInvoiceDetails(input: {
  orgId: string;
  invoiceId: string;
  dueDate?: Date;
  amountDueMinor?: number;
  periodStart?: string;
  periodEnd?: string;
  paymentLinkExpiresAt?: Date | null;
  earlyDiscountPercent?: number;
  earlyDiscountExpiresAt?: Date | null;
  allowPartialPayments?: boolean;
  minimumPartialAmountMinor?: number;
}) {
  await db
    .update(invoices)
    .set({
      dueDate: input.dueDate,
      amountDueMinor: input.amountDueMinor,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      paymentLinkExpiresAt: input.paymentLinkExpiresAt,
      earlyDiscountPercent:
        input.earlyDiscountPercent !== undefined
          ? Math.max(0, input.earlyDiscountPercent)
          : undefined,
      earlyDiscountExpiresAt: input.earlyDiscountExpiresAt,
      allowPartialPayments: input.allowPartialPayments,
      minimumPartialAmountMinor:
        input.minimumPartialAmountMinor !== undefined
          ? Math.max(0, input.minimumPartialAmountMinor)
          : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)));
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

  const dueDate = new Date(`${input.periodEnd}T00:00:00.000Z`);
  const created = await createManualInvoice({
    orgId: input.orgId,
    contactId: plan.contactId,
    paymentPlanId: plan.id,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dueDate,
    amountDueMinor: plan.amountMinor,
    currency: plan.currency,
    status: "SENT",
  });

  const createdInvoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) => and(eq(i.id, created.invoiceId), eq(i.orgId, input.orgId)),
  });

  return {
    invoiceId: created.invoiceId,
    payLinkUrl: createdInvoice?.payLinkUrl ?? null,
  };
}

function advanceRecurringDate(input: {
  from: Date;
  frequency: "WEEKLY" | "MONTHLY";
  intervalCount: number;
  dayOfMonth: number | null;
}) {
  const from = new Date(input.from);
  if (input.frequency === "WEEKLY") {
    return new Date(from.getTime() + Math.max(1, input.intervalCount) * 7 * 86_400_000);
  }

  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + Math.max(1, input.intervalCount));
  if (input.dayOfMonth && input.dayOfMonth >= 1 && input.dayOfMonth <= 28) {
    next.setUTCDate(input.dayOfMonth);
  }
  return next;
}

export async function createRecurringInvoiceSchedule(input: {
  orgId: string;
  contactId: string;
  paymentPlanId?: string | null;
  scheduleName: string;
  amountMinor: number;
  currency?: string;
  frequency: "WEEKLY" | "MONTHLY";
  intervalCount?: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  timezone?: string;
  nextRunAt: Date;
  autoTriggerWorkflow?: boolean;
  invoicePrefix?: string;
  metadata?: Record<string, unknown>;
}) {
  const scheduleId = crypto.randomUUID();

  await db.insert(invoiceRecurringSchedules).values({
    id: scheduleId,
    orgId: input.orgId,
    contactId: input.contactId,
    paymentPlanId: input.paymentPlanId ?? null,
    scheduleName: input.scheduleName,
    amountMinor: input.amountMinor,
    currency: input.currency ?? "USD",
    frequency: input.frequency,
    intervalCount: Math.max(1, input.intervalCount ?? 1),
    dayOfWeek: input.dayOfWeek ?? null,
    dayOfMonth: input.dayOfMonth ?? null,
    timezone: input.timezone ?? "UTC",
    nextRunAt: input.nextRunAt,
    autoTriggerWorkflow: input.autoTriggerWorkflow ?? true,
    invoicePrefix: input.invoicePrefix ?? "INV",
    metadata: input.metadata ?? {},
  });

  return { scheduleId };
}

export async function generateInvoiceFromRecurringSchedule(input: {
  orgId: string;
  scheduleId: string;
  runAt?: Date;
}) {
  const schedule = await db.query.invoiceRecurringSchedules.findFirst({
    where: (s, { and, eq }) => and(eq(s.id, input.scheduleId), eq(s.orgId, input.orgId)),
  });

  if (!schedule) {
    throw new Error("Recurring schedule not found");
  }

  if (schedule.status !== "ACTIVE") {
    throw new Error("Recurring schedule is not active");
  }

  const runAt = input.runAt ?? schedule.nextRunAt;
  const periodStart = runAt.toISOString().slice(0, 10);
  const periodEnd = periodStart;

  const created = await createManualInvoice({
    orgId: schedule.orgId,
    contactId: schedule.contactId,
    paymentPlanId: schedule.paymentPlanId ?? null,
    recurringScheduleId: schedule.id,
    invoiceNumber: buildInvoiceNumber(schedule.invoicePrefix),
    periodStart,
    periodEnd,
    dueDate: runAt,
    amountDueMinor: schedule.amountMinor,
    currency: schedule.currency,
    status: "SENT",
  });

  const nextRunAt = advanceRecurringDate({
    from: runAt,
    frequency: schedule.frequency,
    intervalCount: schedule.intervalCount,
    dayOfMonth: schedule.dayOfMonth ?? null,
  });

  await db
    .update(invoiceRecurringSchedules)
    .set({
      lastRunAt: runAt,
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(invoiceRecurringSchedules.id, schedule.id));

  return {
    invoiceId: created.invoiceId,
    scheduleId: schedule.id,
    nextRunAt,
    autoTriggerWorkflow: schedule.autoTriggerWorkflow,
  };
}

export async function createInvoiceBundle(input: {
  orgId: string;
  invoiceIds: string[];
  title?: string | null;
  dueDate?: Date | null;
  paymentLinkExpiresAt?: Date | null;
}) {
  if (input.invoiceIds.length < 2) {
    throw new Error("Bundle requires at least two invoices");
  }

  const bundleInvoices = await db.query.invoices.findMany({
    where: (i, { and, eq, inArray }) =>
      and(eq(i.orgId, input.orgId), inArray(i.id, input.invoiceIds)),
  });

  if (bundleInvoices.length !== input.invoiceIds.length) {
    throw new Error("One or more invoices were not found");
  }

  const contactId = bundleInvoices[0]?.contactId;
  const currency = bundleInvoices[0]?.currency;
  if (!contactId || !currency) {
    throw new Error("Invalid bundle invoice set");
  }

  for (const invoice of bundleInvoices) {
    if (invoice.contactId !== contactId) {
      throw new Error("All bundled invoices must belong to the same contact");
    }
    if (invoice.currency !== currency) {
      throw new Error("All bundled invoices must share the same currency");
    }
    if (
      invoice.status === "PAID" ||
      invoice.status === "WRITTEN_OFF" ||
      invoice.status === "CANCELED" ||
      invoice.status === "CANCELLED"
    ) {
      throw new Error(`Invoice ${invoice.id} is not bundle-eligible`);
    }
  }

  const amountDueMinor = bundleInvoices.reduce(
    (sum, invoice) => sum + computeOutstandingMinor(invoice),
    0
  );
  const amountPaidMinor = bundleInvoices.reduce(
    (sum, invoice) => sum + Math.max(invoice.amountPaidMinor, 0),
    0
  );

  const bundleId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const bundleNumber = buildBundleNumber();

  await db.transaction(async (trx) => {
    await trx.insert(invoiceBundles).values({
      id: bundleId,
      orgId: input.orgId,
      contactId,
      bundleNumber,
      title: input.title ?? null,
      status: amountDueMinor === 0 ? "PAID" : amountPaidMinor > 0 ? "PARTIALLY_PAID" : "OPEN",
      currency,
      dueDate: input.dueDate ?? null,
      amountDueMinor,
      amountPaidMinor,
      publicPayToken: token,
      payLinkUrl: payLinkForBundle(bundleId, token),
      paymentLinkExpiresAt: input.paymentLinkExpiresAt ?? null,
    });

    await trx.insert(invoiceBundleItems).values(
      bundleInvoices.map((invoice) => ({
        id: crypto.randomUUID(),
        orgId: input.orgId,
        bundleId,
        invoiceId: invoice.id,
      }))
    );

    await trx
      .update(invoices)
      .set({ bundleId, updatedAt: new Date() })
      .where(and(eq(invoices.orgId, input.orgId), inArray(invoices.id, input.invoiceIds)));
  });

  return { bundleId, bundleNumber };
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

  const result = resolveInvoicePaymentResult({
    invoice,
    incomingAmountMinor: input.amountMinor,
  });
  const now = new Date();

  await db
    .update(invoices)
    .set({
      amountPaidMinor: result.amountPaidMinor,
      discountAppliedMinor: result.discountAppliedMinor,
      status: result.status ?? invoice.status,
      paidAt: result.paidInFull ? now : invoice.paidAt,
      updatedAt: now,
    })
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)));

  return {
    paidInFull: result.paidInFull,
    amountPaidMinor: result.amountPaidMinor,
    discountAppliedMinor: result.discountAppliedMinor,
  };
}

export async function writeOffInvoice(input: {
  orgId: string;
  invoiceId: string;
  reason: string;
}) {
  await db
    .update(invoices)
    .set({
      status: "WRITTEN_OFF",
      writeOffReason: input.reason,
      writtenOffAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)));
}

export async function flagInvoiceDispute(input: { orgId: string; invoiceId: string }) {
  await db
    .update(invoices)
    .set({
      status: "IN_DISPUTE",
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)));
}

export async function resolveInvoiceDispute(input: {
  orgId: string;
  invoiceId: string;
  nextStatus?: "DUE" | "SENT" | "OVERDUE";
}) {
  await db
    .update(invoices)
    .set({
      status: input.nextStatus ?? "DUE",
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)));
}

export async function markOverdueInvoices(orgId: string, onDate: string) {
  const onDateEnd = new Date(`${onDate}T23:59:59.999Z`);

  await db
    .update(invoices)
    .set({
      status: "OVERDUE",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(invoices.orgId, orgId),
        inArray(invoices.status, ["DUE", "PARTIAL"]),
        lte(invoices.dueDate, onDateEnd)
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
        inArray(invoices.status, ["SENT", "VIEWED"])
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

export async function refreshBundleTotals(input: { orgId: string; bundleId: string }) {
  const aggregate = await db
    .select({
      due: sql<number>`COALESCE(SUM(${invoices.amountDueMinor} - ${invoices.discountAppliedMinor}), 0)`,
      paid: sql<number>`COALESCE(SUM(${invoices.amountPaidMinor}), 0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.orgId, input.orgId), eq(invoices.bundleId, input.bundleId)));

  const due = Number(aggregate[0]?.due ?? 0);
  const paid = Number(aggregate[0]?.paid ?? 0);

  await db
    .update(invoiceBundles)
    .set({
      amountDueMinor: Math.max(0, due),
      amountPaidMinor: Math.max(0, paid),
      status:
        paid >= due ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : ("OPEN" as const),
      updatedAt: new Date(),
    })
    .where(and(eq(invoiceBundles.id, input.bundleId), eq(invoiceBundles.orgId, input.orgId)));
}
