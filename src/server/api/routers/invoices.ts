import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { invoices } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import { generateInvoiceForPlan } from "@/server/services/invoice.service";
import { createCheckoutForInvoice } from "@/server/services/payment.service";

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfUtcDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

export const invoicesRouter = createTRPCRouter({
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

  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: z
          .enum(["DRAFT", "SENT", "DUE", "OVERDUE", "PAID", "FAILED", "CANCELED"])
          .optional(),
        dueFrom: z.string().date().optional(),
        dueTo: z.string().date().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const whereClause = and(
        eq(invoices.orgId, input.orgId),
        input.status ? eq(invoices.status, input.status) : undefined,
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
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  createCheckoutSession: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const checkout = await createCheckoutForInvoice({
        orgId: input.orgId,
        invoiceId: input.invoiceId,
      });

      return {
        url: checkout.checkoutUrl,
        providerIntentId: checkout.providerIntentId,
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
      return ctx.db.query.invoices.findFirst({
        where: (i, { and, eq }) =>
          and(eq(i.orgId, input.orgId), eq(i.id, input.invoiceId)),
        with: {
          contact: true,
          paymentPlan: true,
          payments: true,
        },
      });
    }),

  markStatus: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        status: z.enum(["SENT", "DUE", "OVERDUE", "CANCELED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(invoices)
        .set({
          status: input.status,
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
        after: { status: input.status },
      });

      return { ok: true };
    }),
});
