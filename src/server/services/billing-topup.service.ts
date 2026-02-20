import { and, eq, gte, lt } from "drizzle-orm";

import { db } from "@/server/db";
import { creditTopups, usageCredits } from "@/server/db/schema";
import { createNotification } from "@/server/services/notification.service";

function currentCycleBounds(now = new Date()) {
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { cycleStart, cycleEnd };
}

async function getOrCreateCurrentUsage(orgId: string, now = new Date()) {
  const { cycleStart, cycleEnd } = currentCycleBounds(now);

  const existing = await db.query.usageCredits.findFirst({
    where: (u, { and, eq }) => and(eq(u.orgId, orgId), eq(u.cycleStart, cycleStart)),
  });

  if (existing) return existing;

  const id = crypto.randomUUID();
  await db.insert(usageCredits).values({
    id,
    orgId,
    cycleStart,
    cycleEnd,
  });

  const inserted = await db.query.usageCredits.findFirst({
    where: (u, { eq }) => eq(u.id, id),
  });

  if (!inserted) {
    throw new Error("Failed to initialize usage cycle");
  }

  return inserted;
}

export async function markTopupFailed(input: {
  orgId: string;
  topupId: string;
  reason?: string;
}) {
  const existing = await db.query.creditTopups.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, input.topupId), eq(t.orgId, input.orgId)),
  });

  if (!existing || existing.status === "FAILED") return;

  await db
    .update(creditTopups)
    .set({
      status: "FAILED",
      updatedAt: new Date(),
    })
    .where(and(eq(creditTopups.id, existing.id), eq(creditTopups.orgId, input.orgId)));

  await createNotification({
    orgId: input.orgId,
    type: "AUTOMATION_FAILED",
    title: "Top-up payment failed",
    body: `Top-up ${existing.packCode} failed${input.reason ? `: ${input.reason}` : ""}`,
    link: "settings/billing",
    metadata: {
      topupId: existing.id,
      reason: input.reason ?? null,
    },
  });
}

export async function settleTopupFromCheckoutSession(input: {
  orgId: string;
  topupId: string;
  stripePaymentIntentId?: string | null;
  purchasedAt?: Date;
}) {
  const topup = await db.query.creditTopups.findFirst({
    where: (t, { and, eq }) => and(eq(t.orgId, input.orgId), eq(t.id, input.topupId)),
  });

  if (!topup) {
    throw new Error("Top-up not found");
  }

  if (topup.status === "SUCCEEDED") {
    return topup;
  }

  const now = input.purchasedAt ?? new Date();
  const usage = await getOrCreateCurrentUsage(input.orgId, now);

  await db
    .update(creditTopups)
    .set({
      status: "SUCCEEDED",
      stripePaymentIntentId: input.stripePaymentIntentId ?? topup.stripePaymentIntentId,
      purchasedAt: now,
      updatedAt: new Date(),
    })
    .where(and(eq(creditTopups.id, topup.id), eq(creditTopups.orgId, input.orgId)));

  await db
    .update(usageCredits)
    .set({
      smsIncluded: usage.smsIncluded + topup.smsCredits,
      emailIncluded: usage.emailIncluded + topup.emailCredits,
      voiceSecondsIncluded: usage.voiceSecondsIncluded + topup.voiceSeconds,
      whatsappIncluded: usage.whatsappIncluded + topup.whatsappCredits,
      updatedAt: new Date(),
    })
    .where(eq(usageCredits.id, usage.id));

  await createNotification({
    orgId: input.orgId,
    type: "PAYMENT_RECEIVED",
    title: "Top-up credits added",
    body: `${topup.packCode} pack credits are now available`,
    link: "settings/billing",
    metadata: {
      topupId: topup.id,
      packCode: topup.packCode,
      smsCredits: topup.smsCredits,
      emailCredits: topup.emailCredits,
      voiceSeconds: topup.voiceSeconds,
      whatsappCredits: topup.whatsappCredits,
    },
  });

  const updated = await db.query.creditTopups.findFirst({
    where: (t, { and, eq }) => and(eq(t.orgId, input.orgId), eq(t.id, input.topupId)),
  });

  if (!updated) {
    throw new Error("Top-up settlement readback failed");
  }

  return updated;
}

export async function getTopupsForCycle(input: {
  orgId: string;
  cycleStart: Date;
  cycleEnd: Date;
}) {
  return db.query.creditTopups.findMany({
    where: (t, { and, eq, gte, lt }) =>
      and(
        eq(t.orgId, input.orgId),
        eq(t.status, "SUCCEEDED"),
        gte(t.purchasedAt, input.cycleStart),
        lt(t.purchasedAt, input.cycleEnd)
      ),
  });
}
