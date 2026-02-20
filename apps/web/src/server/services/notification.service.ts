import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { notifications, orgMembers } from "@/server/db/schema";

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
