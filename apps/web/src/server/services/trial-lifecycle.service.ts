import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { auditLogs, orgs, trialState } from "@/server/db/schema";
import { createNotification } from "@/server/services/notification.service";
import { writeAuditLog } from "@/server/services/audit.service";

function daysBetween(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000));
}

function trialMilestones() {
  return [
    {
      day: 0,
      action: "TRIAL_DAY_0",
      title: "Welcome to your trial",
      body: "Set up your first workflow and send your first reminder.",
    },
    {
      day: 3,
      action: "TRIAL_DAY_3",
      title: "Trial check-in",
      body: "Have you run your first workflow yet?",
    },
    {
      day: 7,
      action: "TRIAL_DAY_7",
      title: "Halfway through trial",
      body: "Review your collections progress and optimize channels.",
    },
    {
      day: 12,
      action: "TRIAL_DAY_12",
      title: "Trial ending soon",
      body: "Upgrade now to avoid interruption on day 14.",
    },
  ] as const;
}

async function alreadySentTrialEvent(input: {
  orgId: string;
  trialId: string;
  action: string;
}) {
  const existing = await db.query.auditLogs.findFirst({
    where: (a, { and, eq }) =>
      and(
        eq(a.orgId, input.orgId),
        eq(a.entityType, "TrialState"),
        eq(a.entityId, input.trialId),
        eq(a.action, input.action)
      ),
  });

  return !!existing;
}

export async function ensureTrialState(orgId: string) {
  const existing = await db.query.trialState.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
  });

  if (existing) return existing;

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 14);

  const id = crypto.randomUUID();
  await db.insert(trialState).values({
    id,
    orgId,
    status: "ACTIVE",
    startsAt: now,
    endsAt,
    requiresCardAt: endsAt,
  });

  const created = await db.query.trialState.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!created) {
    throw new Error("Failed to create trial state");
  }

  return created;
}

export async function processTrialLifecycleSweep(now = new Date()) {
  const organizations = await db.query.orgs.findMany({
    where: (o, { isNull }) => isNull(o.deletedAt),
  });

  let processed = 0;

  for (const org of organizations) {
    const trial = await ensureTrialState(org.id);

    if (trial.status === "ACTIVE" && now >= trial.endsAt) {
      const converted = org.stripeSubscriptionStatus === "active" || org.stripeSubscriptionStatus === "trialing";

      await db
        .update(trialState)
        .set({
          status: converted ? "CONVERTED" : "EXPIRED",
          convertedAt: converted ? now : trial.convertedAt,
          updatedAt: new Date(),
        })
        .where(eq(trialState.id, trial.id));

      await createNotification({
        orgId: org.id,
        type: "AUTOMATION_FAILED",
        title: converted ? "Trial converted" : "Trial expired",
        body: converted
          ? "Your trial converted successfully."
          : "Trial has expired. Add a card to continue sending.",
        link: "settings/billing",
      });

      await writeAuditLog({
        orgId: org.id,
        actorType: "SYSTEM",
        action: converted ? "TRIAL_CONVERTED" : "TRIAL_EXPIRED",
        entityType: "TrialState",
        entityId: trial.id,
      });

      processed += 1;
      continue;
    }

    if (trial.status !== "ACTIVE") {
      continue;
    }

    const elapsed = daysBetween(trial.startsAt, now);

    for (const milestone of trialMilestones()) {
      if (elapsed < milestone.day) continue;

      const alreadySent = await alreadySentTrialEvent({
        orgId: org.id,
        trialId: trial.id,
        action: milestone.action,
      });

      if (alreadySent) continue;

      await createNotification({
        orgId: org.id,
        type: "IMPORT_COMPLETED",
        title: milestone.title,
        body: milestone.body,
        link: "settings/billing",
      });

      await writeAuditLog({
        orgId: org.id,
        actorType: "SYSTEM",
        action: milestone.action,
        entityType: "TrialState",
        entityId: trial.id,
      });
    }

    processed += 1;
  }

  return { processed };
}
