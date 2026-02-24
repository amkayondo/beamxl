import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { trialState } from "@/server/db/schema";
import { resendEmailAdapter } from "@/server/adapters/messaging/resend-email.adapter";
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
      includeGrowthPrompt: false,
    },
    {
      day: 3,
      action: "TRIAL_DAY_3",
      title: "Trial check-in",
      body: "Have you run your first workflow yet?",
      includeGrowthPrompt: false,
    },
    {
      day: 7,
      action: "TRIAL_DAY_7",
      title: "Halfway through trial",
      body: "Here is what you have collected so far. Keep momentum.",
      includeGrowthPrompt: false,
    },
    {
      day: 12,
      action: "TRIAL_DAY_12",
      title: "Trial ending soon",
      body: "Upgrade now to avoid interruption on day 14. Growth+ is pre-selected.",
      includeGrowthPrompt: true,
    },
    {
      day: 14,
      action: "TRIAL_DAY_14",
      title: "Trial ends today",
      body: "Card required today to continue sending. Growth+ is pre-selected.",
      includeGrowthPrompt: true,
    },
  ] as const;
}

function toEmailHtml(input: { title: string; body: string; orgName: string; includeGrowthPrompt: boolean }) {
  const growthBlock = input.includeGrowthPrompt
    ? "<p><strong>Recommended:</strong> Growth+ ($79/mo) is pre-selected for your upgrade.</p>"
    : "";

  return `
    <p>Hi ${input.orgName} team,</p>
    <p><strong>${input.title}</strong></p>
    <p>${input.body}</p>
    ${growthBlock}
    <p>Open DueFlow billing settings to continue.</p>
  `;
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

async function notifyTrialMilestone(input: {
  orgId: string;
  trialId: string;
  action: string;
  title: string;
  body: string;
  includeGrowthPrompt: boolean;
}) {
  const org = await db.query.orgs.findFirst({
    where: (o, { eq }) => eq(o.id, input.orgId),
  });

  if (!org) return;

  await createNotification({
    orgId: input.orgId,
    type: "IMPORT_COMPLETED",
    title: input.title,
    body: input.body,
    link: "settings/billing",
    metadata: {
      trialId: input.trialId,
      action: input.action,
      preselectedPlanCode: input.includeGrowthPrompt ? "GROWTH_PLUS" : null,
    },
  });

  const members = await db.query.orgMembers.findMany({
    where: (m, { and, eq, isNull }) =>
      and(eq(m.orgId, input.orgId), eq(m.status, "ACTIVE"), isNull(m.deletedAt)),
    with: {
      user: true,
    },
  });

  const uniqueEmails = [...new Set(members.map((member) => member.user.email).filter(Boolean))];

  await Promise.all(
    uniqueEmails.map((email) =>
      resendEmailAdapter
        .sendEmail({
          to: email,
          subject: input.title,
          html: toEmailHtml({
            title: input.title,
            body: input.body,
            orgName: org.name,
            includeGrowthPrompt: input.includeGrowthPrompt,
          }),
          text: `${input.title}\n\n${input.body}`,
        })
        .catch((error) => {
          console.error("[trial-lifecycle] email send failed", { orgId: input.orgId, email, error });
        }),
    ),
  );

  await writeAuditLog({
    orgId: input.orgId,
    actorType: "SYSTEM",
    action: input.action,
    entityType: "TrialState",
    entityId: input.trialId,
    after: {
      title: input.title,
      preselectedPlanCode: input.includeGrowthPrompt ? "GROWTH_PLUS" : null,
    },
  });
}

export async function processTrialLifecycleSweep(now = new Date()) {
  const organizations = await db.query.orgs.findMany({
    where: (o, { isNull }) => isNull(o.deletedAt),
  });

  let processed = 0;

  for (const org of organizations) {
    const trial = await ensureTrialState(org.id);

    if (trial.status !== "ACTIVE") {
      processed += 1;
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

      await notifyTrialMilestone({
        orgId: org.id,
        trialId: trial.id,
        action: milestone.action,
        title: milestone.title,
        body: milestone.body,
        includeGrowthPrompt: milestone.includeGrowthPrompt,
      });
    }

    if (now < trial.endsAt) {
      processed += 1;
      continue;
    }

    const converted =
      org.stripeSubscriptionStatus === "active" || org.stripeSubscriptionStatus === "trialing";

    await db
      .update(trialState)
      .set({
        status: converted ? "CONVERTED" : "EXPIRED",
        convertedAt: converted ? now : trial.convertedAt,
        convertedPlanCode: converted ? (org.stripePriceId ?? trial.convertedPlanCode) : trial.convertedPlanCode,
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
      metadata: {
        trialId: trial.id,
        preselectedPlanCode: !converted ? "GROWTH_PLUS" : null,
      },
    });

    await writeAuditLog({
      orgId: org.id,
      actorType: "SYSTEM",
      action: converted ? "TRIAL_CONVERTED" : "TRIAL_EXPIRED",
      entityType: "TrialState",
      entityId: trial.id,
      after: {
        preselectedPlanCode: !converted ? "GROWTH_PLUS" : null,
      },
    });

    processed += 1;
  }

  return { processed };
}
