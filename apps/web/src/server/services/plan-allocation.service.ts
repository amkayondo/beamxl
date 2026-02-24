import { and, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { orgPlanSubscriptions, orgs, planCatalog, trialState } from "@/server/db/schema";

type PlanCode = "STARTER" | "GROWTH_PLUS" | "PRO" | "ENTERPRISE";

type UsageAllocation = {
  planCode: PlanCode;
  smsIncluded: number;
  emailIncluded: number;
  voiceSecondsIncluded: number;
  whatsappIncluded: number;
  source: "catalog" | "fallback";
};

const FALLBACK_ALLOCATIONS: Record<PlanCode, Omit<UsageAllocation, "planCode" | "source">> = {
  STARTER: {
    smsIncluded: 200,
    emailIncluded: 10_000,
    voiceSecondsIncluded: 15 * 60,
    whatsappIncluded: 0,
  },
  GROWTH_PLUS: {
    smsIncluded: 1_500,
    emailIncluded: 20_000,
    voiceSecondsIncluded: 90 * 60,
    whatsappIncluded: 0,
  },
  PRO: {
    smsIncluded: 5_000,
    emailIncluded: 50_000,
    voiceSecondsIncluded: 200 * 60,
    whatsappIncluded: 0,
  },
  ENTERPRISE: {
    smsIncluded: 5_000,
    emailIncluded: 50_000,
    voiceSecondsIncluded: 200 * 60,
    whatsappIncluded: 0,
  },
};

function normalizePlanCode(value: string | null | undefined): PlanCode | null {
  if (!value) return null;
  const normalized = value.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_");
  if (normalized === "STARTER") return "STARTER";
  if (normalized === "GROWTH" || normalized === "GROWTH_PLUS" || normalized === "GROWTHPLUS") {
    return "GROWTH_PLUS";
  }
  if (normalized === "PRO") return "PRO";
  if (normalized === "ENTERPRISE") return "ENTERPRISE";
  return null;
}

function inferPlanCodeFromPriceId(priceId: string | null | undefined): PlanCode | null {
  if (!priceId) return null;
  const normalized = priceId.toLowerCase();
  if (normalized.includes("starter")) return "STARTER";
  if (normalized.includes("growth")) return "GROWTH_PLUS";
  if (normalized.includes("pro")) return "PRO";
  if (normalized.includes("enterprise")) return "ENTERPRISE";
  return null;
}

function fromFallback(planCode: PlanCode): UsageAllocation {
  return {
    planCode,
    ...FALLBACK_ALLOCATIONS[planCode],
    source: "fallback",
  };
}

export async function resolveOrgPlanAllocation(orgId: string): Promise<UsageAllocation> {
  const [org, trial, subscription, activePlans] = await Promise.all([
    db.query.orgs.findFirst({ where: (o, { eq }) => eq(o.id, orgId) }),
    db.query.trialState.findFirst({ where: (t, { eq }) => eq(t.orgId, orgId) }),
    db.query.orgPlanSubscriptions.findFirst({
      where: (s, { and, eq }) => and(eq(s.orgId, orgId), eq(s.status, "ACTIVE")),
      orderBy: (s, { desc }) => [desc(s.updatedAt)],
    }),
    db.query.planCatalog.findMany({
      where: (p, { eq }) => eq(p.isActive, true),
    }),
  ]);

  let planCode: PlanCode | null = null;

  if (subscription?.planId) {
    const plan = activePlans.find((item) => item.id === subscription.planId);
    planCode = normalizePlanCode(plan?.code);
  }

  if (!planCode) {
    planCode = inferPlanCodeFromPriceId(org?.stripePriceId);
  }

  if (!planCode && trial?.status === "ACTIVE") {
    planCode = "GROWTH_PLUS";
  }

  if (!planCode) {
    planCode = "GROWTH_PLUS";
  }

  const plan = activePlans.find((item) => normalizePlanCode(item.code) === planCode);

  if (!plan) {
    return fromFallback(planCode);
  }

  return {
    planCode,
    smsIncluded: Math.max(0, plan.smsCredits),
    emailIncluded: Math.max(0, plan.emailCredits),
    voiceSecondsIncluded: Math.max(0, plan.voiceSeconds),
    whatsappIncluded: 0,
    source: "catalog",
  };
}
