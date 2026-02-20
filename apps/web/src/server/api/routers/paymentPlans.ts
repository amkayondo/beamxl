import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { paymentPlans } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";

export const paymentPlansRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const whereClause = and(
        eq(paymentPlans.orgId, input.orgId),
        isNull(paymentPlans.deletedAt)
      );

      const [items, countRows] = await Promise.all([
        ctx.db.query.paymentPlans.findMany({
          where: whereClause,
          orderBy: (p, { desc }) => [desc(p.createdAt)],
          offset,
          limit: input.pageSize,
          with: {
            contact: true,
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(paymentPlans)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        name: z.string().min(2),
        amountMinor: z.number().int().positive(),
        currency: z.enum(["USD", "RWF", "EUR"]).default("USD"),
        frequency: z.enum(["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY"]),
        dueDayOfMonth: z.number().int().min(1).max(31).optional(),
        graceDays: z.number().int().min(0).max(120).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const planId = crypto.randomUUID();

      await ctx.db.insert(paymentPlans).values({
        id: planId,
        orgId: input.orgId,
        contactId: input.contactId,
        name: input.name,
        amountMinor: input.amountMinor,
        currency: input.currency,
        frequency: input.frequency,
        startDate: new Date().toISOString().slice(0, 10),
        dueDayOfMonth: input.dueDayOfMonth,
        graceDays: input.graceDays,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "PAYMENT_PLAN_CREATED",
        entityType: "PaymentPlan",
        entityId: planId,
        after: input,
      });

      return { planId };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        planId: z.string().min(1),
        status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(paymentPlans)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(and(eq(paymentPlans.id, input.planId), eq(paymentPlans.orgId, input.orgId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "PAYMENT_PLAN_UPDATED",
        entityType: "PaymentPlan",
        entityId: input.planId,
        after: { status: input.status },
      });

      return { ok: true };
    }),
});
