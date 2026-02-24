import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { ensureTrialState } from "@/server/services/trial-lifecycle.service";

function hasActiveBilling(subscriptionStatus: string | null | undefined) {
  return subscriptionStatus === "active" || subscriptionStatus === "trialing";
}

export async function getOrgSendingGate(orgId: string, now = new Date()) {
  const [org, trial] = await Promise.all([
    db.query.orgs.findFirst({
      where: (o, { eq }) => eq(o.id, orgId),
    }),
    ensureTrialState(orgId),
  ]);

  if (!org) {
    return {
      allowed: false,
      reason: "Organization not found",
      trialStatus: trial.status,
    };
  }

  if (hasActiveBilling(org.stripeSubscriptionStatus)) {
    return {
      allowed: true,
      reason: null,
      trialStatus: trial.status,
    };
  }

  const trialExpired = trial.status === "EXPIRED" || now >= trial.endsAt;
  if (trialExpired) {
    if (trial.status !== "EXPIRED") {
      await db
        .update(trialState)
        .set({
          status: "EXPIRED",
          updatedAt: new Date(),
        })
        .where(eq(trialState.id, trial.id));
    }

    return {
      allowed: false,
      reason: "Trial expired. Add a payment method to continue sending.",
      trialStatus: "EXPIRED" as const,
    };
  }

  return {
    allowed: true,
    reason: null,
    trialStatus: trial.status,
  };
}

export async function assertOrgSendingAllowed(orgId: string, now = new Date()) {
  const gate = await getOrgSendingGate(orgId, now);
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "Outbound sending is disabled");
  }
}

import { trialState } from "@/server/db/schema";
