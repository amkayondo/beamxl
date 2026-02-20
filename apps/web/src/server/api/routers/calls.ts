import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { callLogs } from "@/server/db/schema";

export const callsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: z
          .enum(["QUEUED", "RINGING", "ANSWERED", "NO_ANSWER", "BUSY", "FAILED", "COMPLETED"])
          .optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const whereClause = and(
        eq(callLogs.orgId, input.orgId),
        input.status ? eq(callLogs.status, input.status) : undefined
      );

      const [items, countRows] = await Promise.all([
        ctx.db.query.callLogs.findMany({
          where: whereClause,
          orderBy: (c, { desc }) => [desc(c.createdAt)],
          offset,
          limit: input.pageSize,
          with: {
            contact: true,
            invoice: true,
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(callLogs)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),
});
