import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { notifications } from "@/server/db/schema";

const EXCEPTION_TYPES = ["AUTOMATION_FAILED", "COMPLIANCE_BLOCKED"] as const;

export const exceptionsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const whereClause = and(
        eq(notifications.orgId, input.orgId),
        inArray(notifications.type, [...EXCEPTION_TYPES]),
      );

      const [items, count] = await Promise.all([
        ctx.db.query.notifications.findMany({
          where: whereClause,
          orderBy: (n, { desc }) => [desc(n.createdAt)],
          limit: input.pageSize,
          offset,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(count[0]?.count ?? 0),
      };
    }),

  resolve: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        notificationId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(notifications.orgId, input.orgId), eq(notifications.id, input.notificationId)));

      return { ok: true };
    }),
});
