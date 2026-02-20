import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { mobileDeviceTokens, notifications } from "@/server/db/schema";
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

  registerDeviceToken: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        deviceId: z.string().min(1),
        expoPushToken: z.string().min(1),
        platform: z.enum(["IOS", "ANDROID"]),
        appVersion: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      await ctx.db
        .insert(mobileDeviceTokens)
        .values({
          orgId: input.orgId,
          userId: ctx.session.user.id,
          deviceId: input.deviceId,
          expoPushToken: input.expoPushToken,
          platform: input.platform,
          appVersion: input.appVersion,
          isActive: true,
          lastSeenAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: mobileDeviceTokens.expoPushToken,
          set: {
            orgId: input.orgId,
            userId: ctx.session.user.id,
            deviceId: input.deviceId,
            platform: input.platform,
            appVersion: input.appVersion,
            isActive: true,
            lastSeenAt: now,
            updatedAt: now,
          },
        });

      return { success: true };
    }),

  unregisterDeviceToken: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        expoPushToken: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(mobileDeviceTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mobileDeviceTokens.orgId, input.orgId),
            eq(mobileDeviceTokens.userId, ctx.session.user.id),
            eq(mobileDeviceTokens.expoPushToken, input.expoPushToken),
          ),
        );

      return { success: true };
    }),

  listDeviceTokens: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.mobileDeviceTokens.findMany({
        where: (d, { and, eq }) =>
          and(eq(d.orgId, input.orgId), eq(d.userId, ctx.session.user.id)),
        orderBy: (d, { desc }) => [desc(d.lastSeenAt), desc(d.createdAt)],
      });

      return {
        items: rows,
      };
    }),
});
