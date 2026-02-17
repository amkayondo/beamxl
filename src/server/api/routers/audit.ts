import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
} from "@/server/api/trpc";
import { auditLogs } from "@/server/db/schema";

export const auditRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        action: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const whereClause = and(
        eq(auditLogs.orgId, input.orgId),
        input.action ? eq(auditLogs.action, input.action) : undefined,
        input.from ? gte(auditLogs.createdAt, new Date(input.from)) : undefined,
        input.to ? lte(auditLogs.createdAt, new Date(input.to)) : undefined
      );

      const [items, countRows] = await Promise.all([
        ctx.db.query.auditLogs.findMany({
          where: whereClause,
          orderBy: (a, { desc }) => [desc(a.createdAt)],
          offset,
          limit: input.pageSize,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),
});
