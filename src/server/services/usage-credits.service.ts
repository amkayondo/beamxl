import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { overageEvents, usageCredits } from "@/server/db/schema";

type Channel = "SMS" | "WHATSAPP" | "EMAIL" | "VOICE";

function getCurrentCycleBounds(now: Date) {
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  return { cycleStart, cycleEnd };
}

async function getOrCreateCurrentUsageCycle(orgId: string) {
  const now = new Date();
  const { cycleStart, cycleEnd } = getCurrentCycleBounds(now);

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
    throw new Error("Unable to initialize usage credits");
  }

  return inserted;
}

function getUsageSnapshotForChannel(row: typeof usageCredits.$inferSelect, channel: Channel) {
  if (channel === "EMAIL") {
    return { used: row.emailUsed, included: row.emailIncluded };
  }
  if (channel === "VOICE") {
    return { used: row.voiceSecondsUsed, included: row.voiceSecondsIncluded };
  }
  if (channel === "SMS") {
    return { used: row.smsUsed, included: row.smsIncluded };
  }

  return { used: row.whatsappUsed, included: row.whatsappIncluded };
}

async function incrementUsage(
  row: typeof usageCredits.$inferSelect,
  channel: Channel,
  units: number
) {
  if (channel === "EMAIL") {
    await db
      .update(usageCredits)
      .set({
        emailUsed: row.emailUsed + units,
        updatedAt: new Date(),
      })
      .where(eq(usageCredits.id, row.id));
    return;
  }

  if (channel === "VOICE") {
    await db
      .update(usageCredits)
      .set({
        voiceSecondsUsed: row.voiceSecondsUsed + units,
        updatedAt: new Date(),
      })
      .where(eq(usageCredits.id, row.id));
    return;
  }

  if (channel === "SMS") {
    await db
      .update(usageCredits)
      .set({
        smsUsed: row.smsUsed + units,
        updatedAt: new Date(),
      })
      .where(eq(usageCredits.id, row.id));
    return;
  }

  await db
    .update(usageCredits)
    .set({
      whatsappUsed: row.whatsappUsed + units,
      updatedAt: new Date(),
    })
    .where(eq(usageCredits.id, row.id));
}

export async function enforceAndRecordUsage(input: {
  orgId: string;
  channel: Channel;
  units: number;
}) {
  const row = await getOrCreateCurrentUsageCycle(input.orgId);
  const snapshot = getUsageSnapshotForChannel(row, input.channel);
  const projected = snapshot.used + input.units;
  const overBy = Math.max(projected - snapshot.included, 0);

  if (row.overageMode === "HARD_STOP" && overBy > 0) {
    throw new Error(`Usage cap reached for ${input.channel}`);
  }

  await incrementUsage(row, input.channel, input.units);

  if (overBy > 0) {
    await db.insert(overageEvents).values({
      orgId: input.orgId,
      channel: input.channel,
      units: input.units,
      amountMinor: 0,
      metadata: {
        overBy,
        cycleStart: row.cycleStart.toISOString(),
        cycleEnd: row.cycleEnd.toISOString(),
      } as Record<string, unknown>,
    });
  }

  return {
    allowed: true,
    projected,
    included: snapshot.included,
    overBy,
  };
}
