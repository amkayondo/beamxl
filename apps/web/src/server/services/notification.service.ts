import { and, eq, isNull, sql } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";
import { mobileDeviceTokens, notifications, orgMembers } from "@/server/db/schema";

type CreateNotificationPayload = {
  orgId: string;
  userId?: string;
  type:
    | "PAYMENT_RECEIVED"
    | "CONTACT_REPLIED"
    | "CONTACT_OPTED_OUT"
    | "AUTOMATION_FAILED"
    | "FLOW_COMPLETED"
    | "IMPORT_COMPLETED"
    | "COMPLIANCE_BLOCKED";
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function normalizeExpoPushToken(token: string) {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendPushToTokens(tokens: string[], payload: PushNotificationPayload) {
  const validTokens = tokens.filter(normalizeExpoPushToken);
  if (validTokens.length === 0) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(env.EXPO_PUSH_ACCESS_TOKEN
        ? {
            Authorization: `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}`,
          }
        : {}),
    },
    body: JSON.stringify(
      validTokens.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }))
    ),
  }).catch((error) => {
    console.error("[notifications] expo push dispatch failed", error);
  });
}

async function sendPushNotificationToUser(input: {
  orgId: string;
  userId: string;
  payload: PushNotificationPayload;
}) {
  const deviceTokens = await db.query.mobileDeviceTokens.findMany({
    where: (d, { and, eq }) =>
      and(eq(d.orgId, input.orgId), eq(d.userId, input.userId), eq(d.isActive, true)),
    columns: {
      expoPushToken: true,
    },
    limit: 100,
  });

  await sendPushToTokens(
    deviceTokens.map((item) => item.expoPushToken),
    input.payload
  );
}

export async function createNotification(payload: CreateNotificationPayload) {
  if (payload.userId) {
    await db.insert(notifications).values({
      orgId: payload.orgId,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
      metadata: payload.metadata ?? null,
    });
    await sendPushNotificationToUser({
      orgId: payload.orgId,
      userId: payload.userId,
      payload: {
        title: payload.title,
        body: payload.body,
        data: payload.metadata,
      },
    });
    return;
  }

  // Fan out to all active members of the org
  const members = await db.query.orgMembers.findMany({
    where: (m, { and, eq, isNull }) =>
      and(
        eq(m.orgId, payload.orgId),
        eq(m.status, "ACTIVE"),
        isNull(m.deletedAt),
      ),
  });

  if (members.length === 0) return;

  const values = members.map((member) => ({
    orgId: payload.orgId,
    userId: member.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
    metadata: (payload.metadata ?? null) as Record<string, unknown> | null,
  }));

  await db.insert(notifications).values(values);

  await Promise.all(
    members.map((member) =>
      sendPushNotificationToUser({
        orgId: payload.orgId,
        userId: member.userId,
        payload: {
          title: payload.title,
          body: payload.body,
          data: payload.metadata,
        },
      })
    )
  );
}

export async function getUnreadCount(userId: string, orgId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        isNull(notifications.readAt),
      ),
    );

  return Number(result[0]?.count ?? 0);
}

export async function markRead(notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    );
}

export async function markAllRead(userId: string, orgId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        isNull(notifications.readAt),
      ),
    );
}
