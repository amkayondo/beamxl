import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { invoiceBundles, invoiceRecurringSchedules, invoices } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  createInvoiceBundle,
  createManualInvoice,
  createRecurringInvoiceSchedule,
  flagInvoiceDispute,
  generateInvoiceForPlan,
  generateInvoiceFromRecurringSchedule,
  resolveInvoiceDispute,
  updateInvoiceDetails,
  writeOffInvoice,
} from "@/server/services/invoice.service";
import {
  toCanonicalInvoiceStatus,
  toStoredInvoiceStatus,
  type InvoiceStatusInput,
} from "@/server/services/invoice-status.service";
import { createCheckoutForInvoice } from "@/server/services/payment.service";

const invoiceStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "VIEWED",
  "DUE",
  "OVERDUE",
  "PARTIAL",
  "PAID",
  "FAILED",
  "CANCELED",
  "CANCELLED",
  "WRITTEN_OFF",
  "IN_DISPUTE",
]);

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfUtcDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

export const invoicesRouter = createTRPCRouter({
  createManual: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        paymentPlanId: z.string().min(1).optional().nullable(),
        recurringScheduleId: z.string().min(1).optional().nullable(),
        invoiceNumber: z.string().min(1).optional(),
        periodStart: z.string().date(),
        periodEnd: z.string().date(),
        dueDate: z.string().datetime(),
        amountDueMinor: z.number().int().positive(),
        currency: z.string().length(3).default("USD"),
        status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
        paymentLinkExpiresAt: z.string().datetime().optional().nullable(),
        earlyDiscountPercent: z.number().int().min(0).max(100).optional(),
        earlyDiscountExpiresAt: z.string().datetime().optional().nullable(),
        allowPartialPayments: z.boolean().optional(),
        minimumPartialAmountMinor: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const created = await createManualInvoice({
        orgId: input.orgId,
        contactId: input.contactId,
        paymentPlanId: input.paymentPlanId,
        recurringScheduleId: input.recurringScheduleId,
        invoiceNumber: input.invoiceNumber,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueDate: new Date(input.dueDate),
        amountDueMinor: input.amountDueMinor,
        currency: input.currency.toUpperCase(),
        status: input.status,
        paymentLinkExpiresAt: input.paymentLinkExpiresAt
          ? new Date(input.paymentLinkExpiresAt)
          : null,
        earlyDiscountPercent: input.earlyDiscountPercent,
        earlyDiscountExpiresAt: input.earlyDiscountExpiresAt
          ? new Date(input.earlyDiscountExpiresAt)
          : null,
        allowPartialPayments: input.allowPartialPayments,
        minimumPartialAmountMinor: input.minimumPartialAmountMinor,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_CREATED_MANUAL",
        entityType: "Invoice",
        entityId: created.invoiceId,
        after: input,
      });

      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        dueDate: z.string().datetime().optional(),
        amountDueMinor: z.number().int().positive().optional(),
        periodStart: z.string().date().optional(),
        periodEnd: z.string().date().optional(),
        paymentLinkExpiresAt: z.string().datetime().optional().nullable(),
        earlyDiscountPercent: z.number().int().min(0).max(100).optional(),
        earlyDiscountExpiresAt: z.string().datetime().optional().nullable(),
        allowPartialPayments: z.boolean().optional(),
        minimumPartialAmountMinor: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateInvoiceDetails({
        orgId: input.orgId,
        invoiceId: input.invoiceId,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        amountDueMinor: input.amountDueMinor,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        paymentLinkExpiresAt:
          input.paymentLinkExpiresAt !== undefined
            ? input.paymentLinkExpiresAt
              ? new Date(input.paymentLinkExpiresAt)
              : null
            : undefined,
        earlyDiscountPercent: input.earlyDiscountPercent,
        earlyDiscountExpiresAt:
          input.earlyDiscountExpiresAt !== undefined
            ? input.earlyDiscountExpiresAt
              ? new Date(input.earlyDiscountExpiresAt)
              : null
            : undefined,
        allowPartialPayments: input.allowPartialPayments,
        minimumPartialAmountMinor: input.minimumPartialAmountMinor,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_UPDATED",
        entityType: "Invoice",
        entityId: input.invoiceId,
        after: input,
      });

      return { ok: true };
    }),

  generateForPlan: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        paymentPlanId: z.string().min(1),
        periodStart: z.string().date(),
        periodEnd: z.string().date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generated = await generateInvoiceForPlan(input);

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_GENERATED",
        entityType: "Invoice",
        entityId: generated.invoiceId,
        after: input,
      });

      return generated;
    }),

  createBundle: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceIds: z.array(z.string().min(1)).min(2),
        title: z.string().optional(),
        dueDate: z.string().datetime().optional(),
        paymentLinkExpiresAt: z.string().datetime().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const created = await createInvoiceBundle({
        orgId: input.orgId,
        invoiceIds: input.invoiceIds,
        title: input.title,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        paymentLinkExpiresAt: input.paymentLinkExpiresAt
          ? new Date(input.paymentLinkExpiresAt)
          : null,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_BUNDLE_CREATED",
        entityType: "InvoiceBundle",
        entityId: created.bundleId,
        after: input,
      });

      return created;
    }),

  listBundles: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const [items, countRows] = await Promise.all([
        ctx.db.query.invoiceBundles.findMany({
          where: (b, { eq }) => eq(b.orgId, input.orgId),
          orderBy: (b, { desc }) => [desc(b.createdAt)],
          limit: input.pageSize,
          offset,
          with: {
            contact: true,
            items: {
              with: {
                invoice: true,
              },
            },
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(invoiceBundles)
          .where(eq(invoiceBundles.orgId, input.orgId)),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  createRecurringSchedule: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        paymentPlanId: z.string().min(1).optional().nullable(),
        scheduleName: z.string().min(1),
        amountMinor: z.number().int().positive(),
        currency: z.string().length(3).default("USD"),
        frequency: z.enum(["WEEKLY", "MONTHLY"]),
        intervalCount: z.number().int().min(1).default(1),
        dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
        dayOfMonth: z.number().int().min(1).max(28).optional().nullable(),
        timezone: z.string().min(1).default("UTC"),
        nextRunAt: z.string().datetime(),
        autoTriggerWorkflow: z.boolean().default(true),
        invoicePrefix: z.string().min(1).default("INV"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const created = await createRecurringInvoiceSchedule({
        ...input,
        currency: input.currency.toUpperCase(),
        nextRunAt: new Date(input.nextRunAt),
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_RECURRING_SCHEDULE_CREATED",
        entityType: "RecurringSchedule",
        entityId: created.scheduleId,
        after: input,
      });

      return created;
    }),

  listRecurringSchedules: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.invoiceRecurringSchedules.findMany({
        where: (s, { and, eq, isNull }) =>
          and(eq(s.orgId, input.orgId), isNull(s.deletedAt)),
        orderBy: (s, { asc }) => [asc(s.nextRunAt)],
        with: {
          contact: true,
          paymentPlan: true,
        },
      });
    }),

  runRecurringScheduleNow: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        scheduleId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generated = await generateInvoiceFromRecurringSchedule({
        orgId: input.orgId,
        scheduleId: input.scheduleId,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_RECURRING_RUN",
        entityType: "RecurringSchedule",
        entityId: input.scheduleId,
        after: {
          invoiceId: generated.invoiceId,
          nextRunAt: generated.nextRunAt,
        },
      });

      return generated;
    }),

  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: invoiceStatusSchema.optional(),
        dueFrom: z.string().date().optional(),
        dueTo: z.string().date().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const storedStatus = input.status ? toStoredInvoiceStatus(input.status) : undefined;

      const whereClause = and(
        eq(invoices.orgId, input.orgId),
        storedStatus ? eq(invoices.status, storedStatus) : undefined,
        input.dueFrom ? gte(invoices.dueDate, startOfUtcDay(input.dueFrom)) : undefined,
        input.dueTo ? lte(invoices.dueDate, endOfUtcDay(input.dueTo)) : undefined
      );

      const [items, countRows] = await Promise.all([
        ctx.db.query.invoices.findMany({
          where: whereClause,
          orderBy: (i, { desc }) => [desc(i.dueDate), desc(i.createdAt)],
          offset,
          limit: input.pageSize,
          with: {
            contact: true,
            paymentPlan: true,
            bundle: true,
            recurringSchedule: true,
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(whereClause),
      ]);

      return {
        items: items.map((item) => ({
          ...item,
          status: toCanonicalInvoiceStatus(item.status as InvoiceStatusInput),
        })),
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  createCheckoutSession: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        amountMinor: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const checkout = await createCheckoutForInvoice({
        orgId: input.orgId,
        invoiceId: input.invoiceId,
        amountMinor: input.amountMinor,
      });

      return {
        url: checkout.checkoutUrl,
        providerIntentId: checkout.providerIntentId,
        amountMinor: checkout.amountMinor,
      };
    }),

  byId: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.query.invoices.findFirst({
        where: (i, { and, eq }) =>
          and(eq(i.orgId, input.orgId), eq(i.id, input.invoiceId)),
        with: {
          contact: true,
          paymentPlan: true,
          payments: true,
          bundle: {
            with: {
              items: true,
            },
          },
          recurringSchedule: true,
        },
      });

      if (!invoice) return null;

      return {
        ...invoice,
        status: toCanonicalInvoiceStatus(invoice.status as InvoiceStatusInput),
      };
    }),

  writeOff: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await writeOffInvoice(input);
      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_WRITTEN_OFF",
        entityType: "Invoice",
        entityId: input.invoiceId,
        after: { reason: input.reason },
      });

      return { ok: true };
    }),

  markDispute: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await flagInvoiceDispute(input);
      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_FLAGGED_DISPUTE",
        entityType: "Invoice",
        entityId: input.invoiceId,
      });
      return { ok: true };
    }),

  resolveDispute: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        nextStatus: z.enum(["SENT", "DUE", "OVERDUE"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await resolveInvoiceDispute(input);
      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_DISPUTE_RESOLVED",
        entityType: "Invoice",
        entityId: input.invoiceId,
        after: { nextStatus: input.nextStatus ?? "DUE" },
      });
      return { ok: true };
    }),

  markStatus: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        status: invoiceStatusSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storedStatus = toStoredInvoiceStatus(input.status);

      await ctx.db
        .update(invoices)
        .set({
          status: storedStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.orgId, input.orgId), eq(invoices.id, input.invoiceId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INVOICE_STATUS_UPDATED",
        entityType: "Invoice",
        entityId: input.invoiceId,
        after: { status: toCanonicalInvoiceStatus(input.status) },
      });

      return { ok: true };
    }),
});
