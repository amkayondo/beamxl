import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { notifications } from "@/server/db/schema";
import {
  getUnreadCount,
  markAllRead as markAllReadService,
  markRead as markReadService,
} from "@/server/services/notification.service";

export const notificationsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        unreadOnly: z.boolean().optional().default(false),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const userId = ctx.session.user.id;

      const whereClause = and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, input.orgId),
        input.unreadOnly ? isNull(notifications.readAt) : undefined,
      );

      const [items, countRows, unreadCount] = await Promise.all([
        ctx.db.query.notifications.findMany({
          where: whereClause,
          orderBy: (n: any, { desc }: any) => [desc(n.createdAt)],
          offset,
          limit: input.pageSize,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(whereClause),
        getUnreadCount(userId, input.orgId),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
        unreadCount,
      };
    }),

  unreadCount: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const count = await getUnreadCount(ctx.session.user.id, input.orgId);
      return { count };
    }),

  markRead: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        notificationId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await markReadService(input.notificationId, ctx.session.user.id);
      return { success: true };
    }),

  markAllRead: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await markAllReadService(ctx.session.user.id, input.orgId);
      return { success: true };
    }),
});
