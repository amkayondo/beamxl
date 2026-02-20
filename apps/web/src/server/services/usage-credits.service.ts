import { and, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { overageCaps, overageEvents, usageCredits } from "@/server/db/schema";
import { createNotification } from "@/server/services/notification.service";

type Channel = "SMS" | "WHATSAPP" | "EMAIL" | "VOICE";

type UsageRow = typeof usageCredits.$inferSelect;

type OveragePolicy = {
  mode: "HARD_STOP" | "CONTINUE_AND_BILL";
  capMinor: number;
  threshold10Enabled: boolean;
  threshold25Enabled: boolean;
  threshold50Enabled: boolean;
};

function getCurrentCycleBounds(now: Date) {
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { cycleStart, cycleEnd };
}

async function getOrCreateCurrentUsageCycle(orgId: string, now = new Date()) {
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

function getUsageSnapshotForChannel(row: UsageRow, channel: Channel) {
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

function calculateOverageAmountMinor(input: {
  channel: Channel;
  incrementalOverageUnits: number;
}) {
  if (input.incrementalOverageUnits <= 0) return 0;

  if (input.channel === "EMAIL") {
    return 0;
  }

  if (input.channel === "VOICE") {
    // $0.03 per minute, rounded up by minute for deterministic billing.
    return Math.ceil(input.incrementalOverageUnits / 60) * 3;
  }

  // $0.012 per message for SMS/WhatsApp.
  return Math.round(input.incrementalOverageUnits * 1.2);
}

async function getCurrentOverageSpendMinor(input: {
  orgId: string;
  cycleStart: Date;
  cycleEnd: Date;
}) {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${overageEvents.amountMinor}), 0)` })
    .from(overageEvents)
    .where(
      and(
        eq(overageEvents.orgId, input.orgId),
        gte(overageEvents.occurredAt, input.cycleStart),
        lt(overageEvents.occurredAt, input.cycleEnd)
      )
    );

  return Number(rows[0]?.total ?? 0);
}

async function loadOveragePolicy(orgId: string, row: UsageRow): Promise<OveragePolicy> {
  const cap = await db.query.overageCaps.findFirst({
    where: (c, { eq }) => eq(c.orgId, orgId),
  });

  if (cap) {
    return {
      mode: cap.mode,
      capMinor: cap.capMinor,
      threshold10Enabled: cap.threshold10Enabled,
      threshold25Enabled: cap.threshold25Enabled,
      threshold50Enabled: cap.threshold50Enabled,
    };
  }

  return {
    mode: row.overageMode,
    capMinor: row.overageCapMinor,
    threshold10Enabled: true,
    threshold25Enabled: true,
    threshold50Enabled: true,
  };
}

async function incrementUsage(row: UsageRow, channel: Channel, units: number) {
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

async function hasThresholdMarker(input: {
  orgId: string;
  thresholdMinor: number;
  cycleStart: Date;
  cycleEnd: Date;
}) {
  const existing = await db.query.overageEvents.findFirst({
    where: (e, { and, eq, gte, lt }) =>
      and(
        eq(e.orgId, input.orgId),
        eq(e.thresholdMinor, input.thresholdMinor),
        gte(e.occurredAt, input.cycleStart),
        lt(e.occurredAt, input.cycleEnd)
      ),
  });

  return !!existing;
}

async function maybeNotifyThreshold(input: {
  orgId: string;
  cycleStart: Date;
  cycleEnd: Date;
  previousSpendMinor: number;
  nextSpendMinor: number;
  policy: OveragePolicy;
}) {
  const thresholds: Array<{
    thresholdMinor: number;
    enabled: boolean;
  }> = [
    { thresholdMinor: 1000, enabled: input.policy.threshold10Enabled },
    { thresholdMinor: 2500, enabled: input.policy.threshold25Enabled },
    { thresholdMinor: 5000, enabled: input.policy.threshold50Enabled },
  ];

  for (const item of thresholds) {
    if (!item.enabled) continue;
    if (!(input.previousSpendMinor < item.thresholdMinor && input.nextSpendMinor >= item.thresholdMinor)) {
      continue;
    }

    const alreadyMarked = await hasThresholdMarker({
      orgId: input.orgId,
      thresholdMinor: item.thresholdMinor,
      cycleStart: input.cycleStart,
      cycleEnd: input.cycleEnd,
    });

    if (alreadyMarked) {
      continue;
    }

    await db.insert(overageEvents).values({
      orgId: input.orgId,
      channel: "EMAIL",
      units: 0,
      amountMinor: 0,
      thresholdMinor: item.thresholdMinor,
      metadata: {
        marker: "THRESHOLD_NOTIFIED",
      } as Record<string, unknown>,
    });

    await createNotification({
      orgId: input.orgId,
      type: "AUTOMATION_FAILED",
      title: "Overage threshold reached",
      body: `Usage overage has reached $${(item.thresholdMinor / 100).toFixed(2)} this cycle.`,
      link: "settings/billing",
      metadata: {
        thresholdMinor: item.thresholdMinor,
      },
    });
  }
}

export async function enforceAndRecordUsage(input: {
  orgId: string;
  channel: Channel;
  units: number;
}) {
  const now = new Date();
  const row = await getOrCreateCurrentUsageCycle(input.orgId, now);
  const policy = await loadOveragePolicy(input.orgId, row);

  const snapshot = getUsageSnapshotForChannel(row, input.channel);
  const projected = snapshot.used + input.units;

  const previousOverageUnits = Math.max(snapshot.used - snapshot.included, 0);
  const nextOverageUnits = Math.max(projected - snapshot.included, 0);
  const incrementalOverageUnits = Math.max(nextOverageUnits - previousOverageUnits, 0);

  const incrementalAmountMinor = calculateOverageAmountMinor({
    channel: input.channel,
    incrementalOverageUnits,
  });

  const currentOverageSpendMinor = await getCurrentOverageSpendMinor({
    orgId: input.orgId,
    cycleStart: row.cycleStart,
    cycleEnd: row.cycleEnd,
  });

  if (policy.mode === "HARD_STOP" && incrementalOverageUnits > 0) {
    throw new Error(`Usage cap reached for ${input.channel}`);
  }

  if (
    policy.mode === "CONTINUE_AND_BILL" &&
    policy.capMinor > 0 &&
    currentOverageSpendMinor + incrementalAmountMinor > policy.capMinor
  ) {
    throw new Error(`Overage spending cap reached for ${input.channel}`);
  }

  await incrementUsage(row, input.channel, input.units);

  if (incrementalOverageUnits > 0) {
    await db.insert(overageEvents).values({
      orgId: input.orgId,
      channel: input.channel,
      units: incrementalOverageUnits,
      amountMinor: incrementalAmountMinor,
      metadata: {
        usedBefore: snapshot.used,
        usedAfter: projected,
        included: snapshot.included,
        cycleStart: row.cycleStart.toISOString(),
        cycleEnd: row.cycleEnd.toISOString(),
      } as Record<string, unknown>,
    });

    await maybeNotifyThreshold({
      orgId: input.orgId,
      cycleStart: row.cycleStart,
      cycleEnd: row.cycleEnd,
      previousSpendMinor: currentOverageSpendMinor,
      nextSpendMinor: currentOverageSpendMinor + incrementalAmountMinor,
      policy,
    });
  }

  return {
    allowed: true,
    projected,
    included: snapshot.included,
    overBy: nextOverageUnits,
    incrementalOverageUnits,
    incrementalAmountMinor,
    overageMode: policy.mode,
    overageCapMinor: policy.capMinor,
  };
}
