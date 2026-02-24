import { eq } from "drizzle-orm";

import {
  FINAL_ONBOARDING_STEP,
  ONBOARDING_STEPS,
  onboardingStepIdFromKey,
  onboardingStepKeyFromId,
  type OnboardingStepId,
  type OnboardingStepKey,
  type OnboardingStepStatus,
} from "@/lib/onboarding";
import { db } from "@/server/db";
import { orgs } from "@/server/db/schema";

type JsonRecord = Record<string, unknown>;

type StoredOnboardingStep = {
  completedAt: string;
  payload?: JsonRecord;
};

type StoredPhoneVerification = {
  status: "UNVERIFIED" | "PENDING" | "VERIFIED";
  phoneE164?: string;
  requestedAt?: string;
  verifiedAt?: string;
  code?: string;
  codeExpiresAt?: string;
  attempts?: number;
};

type StoredOnboardingState = {
  version: 1;
  startedAt: string;
  completedAt?: string;
  steps: Partial<Record<OnboardingStepKey, StoredOnboardingStep>>;
  phoneVerification: StoredPhoneVerification;
};

type MissionBriefingWizard = {
  completedSteps?: number[];
  stepPayload?: Record<string, unknown>;
};

type MissionBriefingGoals = {
  monthlyCollectionTargetMinor?: number;
  acceptableDsoDays?: number;
  priority?: "SPEED" | "RELATIONSHIP";
  defaultTone?: "FRIENDLY" | "PROFESSIONAL" | "FIRM";
  escalationThresholds?: Record<string, unknown>;
  contactRestrictions?: Record<string, unknown>;
  updateChannel?: "SMS" | "WHATSAPP" | "EMAIL" | "VOICE" | "IN_APP";
  updateFrequency?: "REAL_TIME" | "DAILY" | "WEEKLY";
};

export type MissionBriefingState = JsonRecord & {
  wizard?: MissionBriefingWizard;
  onboarding?: StoredOnboardingState;
  goals?: MissionBriefingGoals;
};

export type OnboardingPublicStep = {
  id: OnboardingStepId;
  key: OnboardingStepKey;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  completedAt: string | null;
  payload: JsonRecord | null;
};

export type OnboardingPublicState = {
  isComplete: boolean;
  completedStepIds: OnboardingStepId[];
  currentStepId: OnboardingStepId;
  steps: OnboardingPublicStep[];
  phoneVerificationStatus: StoredPhoneVerification["status"];
  phoneVerificationRequired: true;
  channelUnlocks: {
    sms: boolean;
    voice: boolean;
  };
};

type OrgOnboardingSnapshot = {
  org: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    defaultCurrency: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
  missionBriefing: MissionBriefingState;
  onboardingState: OnboardingPublicState;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function toMissionBriefingState(value: unknown): MissionBriefingState {
  if (!isRecord(value)) return {};
  return value as MissionBriefingState;
}

function createDefaultOnboardingState(nowIso: string): StoredOnboardingState {
  return {
    version: 1,
    startedAt: nowIso,
    steps: {},
    phoneVerification: {
      status: "UNVERIFIED",
    },
  };
}

function normalizeStoredOnboarding(
  missionBriefing: MissionBriefingState,
): StoredOnboardingState {
  const nowIso = new Date().toISOString();
  const maybeStored = missionBriefing.onboarding;
  const fallback = createDefaultOnboardingState(nowIso);

  if (!maybeStored || !isRecord(maybeStored)) {
    return hydrateFromLegacyWizard(fallback, missionBriefing.wizard);
  }

  const steps: Partial<Record<OnboardingStepKey, StoredOnboardingStep>> = {};
  for (const step of ONBOARDING_STEPS) {
    const rawStep = (maybeStored.steps as Record<string, unknown> | undefined)?.[
      step.key
    ];
    if (!isRecord(rawStep)) continue;

    const completedAt =
      typeof rawStep.completedAt === "string" ? rawStep.completedAt : null;
    if (!completedAt) continue;

    steps[step.key] = {
      completedAt,
      payload: asRecord(rawStep.payload),
    };
  }

  const rawPhoneVerification: JsonRecord = isRecord(maybeStored.phoneVerification)
    ? maybeStored.phoneVerification
    : {};
  const status = rawPhoneVerification.status;
  const phoneStatus: StoredPhoneVerification["status"] =
    status === "PENDING" || status === "VERIFIED" ? status : "UNVERIFIED";

  const normalized: StoredOnboardingState = {
    version: 1,
    startedAt:
      typeof maybeStored.startedAt === "string" ? maybeStored.startedAt : nowIso,
    completedAt:
      typeof maybeStored.completedAt === "string"
        ? maybeStored.completedAt
        : undefined,
    steps,
    phoneVerification: {
      status: phoneStatus,
      phoneE164:
        typeof rawPhoneVerification.phoneE164 === "string"
          ? rawPhoneVerification.phoneE164
          : undefined,
      requestedAt:
        typeof rawPhoneVerification.requestedAt === "string"
          ? rawPhoneVerification.requestedAt
          : undefined,
      verifiedAt:
        typeof rawPhoneVerification.verifiedAt === "string"
          ? rawPhoneVerification.verifiedAt
          : undefined,
      code:
        typeof rawPhoneVerification.code === "string"
          ? rawPhoneVerification.code
          : undefined,
      codeExpiresAt:
        typeof rawPhoneVerification.codeExpiresAt === "string"
          ? rawPhoneVerification.codeExpiresAt
          : undefined,
      attempts:
        typeof rawPhoneVerification.attempts === "number"
          ? rawPhoneVerification.attempts
          : 0,
    },
  };

  return hydrateFromLegacyWizard(normalized, missionBriefing.wizard);
}

function hydrateFromLegacyWizard(
  onboarding: StoredOnboardingState,
  wizard?: MissionBriefingWizard,
): StoredOnboardingState {
  const completed = Array.isArray(wizard?.completedSteps)
    ? wizard.completedSteps
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6)
    : [];

  if (!completed.length) return onboarding;

  const nextSteps = { ...onboarding.steps };
  for (const stepId of completed) {
    const id = stepId as OnboardingStepId;
    const key = onboardingStepKeyFromId(id);
    if (nextSteps[key]) continue;

    const payload = asRecord(wizard?.stepPayload?.[`step_${id}`]);
    nextSteps[key] = {
      completedAt: onboarding.startedAt,
      payload,
    };
  }

  return {
    ...onboarding,
    steps: nextSteps,
  };
}

function allPreviousStepsCompleted(
  onboarding: StoredOnboardingState,
  stepId: OnboardingStepId,
) {
  for (const step of ONBOARDING_STEPS) {
    if (step.id >= stepId) break;
    if (!onboarding.steps[step.key]?.completedAt) {
      return false;
    }
  }

  return true;
}

function collectCompletedStepIds(
  onboarding: StoredOnboardingState,
): OnboardingStepId[] {
  return ONBOARDING_STEPS.filter((step) => Boolean(onboarding.steps[step.key]?.completedAt))
    .map((step) => step.id)
    .sort((a, b) => a - b);
}

function computeCurrentStepId(onboarding: StoredOnboardingState): OnboardingStepId {
  const current = ONBOARDING_STEPS.find(
    (step) => !onboarding.steps[step.key]?.completedAt,
  );

  return current?.id ?? FINAL_ONBOARDING_STEP;
}

function toPublicState(onboarding: StoredOnboardingState): OnboardingPublicState {
  const completedStepIds = collectCompletedStepIds(onboarding);
  const isComplete = completedStepIds.length === ONBOARDING_STEPS.length;
  const phoneVerified = onboarding.phoneVerification.status === "VERIFIED";

  const steps: OnboardingPublicStep[] = ONBOARDING_STEPS.map((step) => {
    const stored = onboarding.steps[step.key];
    const isCompleted = Boolean(stored?.completedAt);
    const status: OnboardingStepStatus = isCompleted
      ? "COMPLETED"
      : allPreviousStepsCompleted(onboarding, step.id)
        ? "AVAILABLE"
        : "LOCKED";

    return {
      id: step.id,
      key: step.key,
      title: step.title,
      description: step.description,
      status,
      completedAt: stored?.completedAt ?? null,
      payload: stored?.payload ?? null,
    };
  });

  return {
    isComplete,
    completedStepIds,
    currentStepId: computeCurrentStepId(onboarding),
    steps,
    phoneVerificationStatus: onboarding.phoneVerification.status,
    phoneVerificationRequired: true,
    channelUnlocks: {
      sms: phoneVerified,
      voice: phoneVerified,
    },
  };
}

function withLegacyWizardMirror(
  missionBriefing: MissionBriefingState,
  onboarding: StoredOnboardingState,
): MissionBriefingState {
  const completedSteps = collectCompletedStepIds(onboarding);
  const stepPayload: Record<string, unknown> = {
    ...(missionBriefing.wizard?.stepPayload ?? {}),
  };

  for (const stepId of completedSteps) {
    const key = onboardingStepKeyFromId(stepId);
    const payload = onboarding.steps[key]?.payload;
    if (payload && Object.keys(payload).length) {
      stepPayload[`step_${stepId}`] = payload;
    }
  }

  return {
    ...missionBriefing,
    onboarding,
    wizard: {
      completedSteps,
      stepPayload,
    },
  };
}

async function loadOrgWithOnboardingState(database: typeof db, orgId: string) {
  const org = await database.query.orgs.findFirst({
    where: (o, { eq }) => eq(o.id, orgId),
    columns: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      defaultCurrency: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      missionBriefing: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const missionBriefing = toMissionBriefingState(org.missionBriefing);
  const onboarding = normalizeStoredOnboarding(missionBriefing);

  return {
    org,
    missionBriefing,
    onboarding,
  };
}

async function persistOnboardingState(
  database: typeof db,
  orgId: string,
  missionBriefing: MissionBriefingState,
  onboarding: StoredOnboardingState,
) {
  const nextMissionBriefing = withLegacyWizardMirror(missionBriefing, onboarding);

  await database
    .update(orgs)
    .set({
      missionBriefing: nextMissionBriefing as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(orgs.id, orgId));

  return nextMissionBriefing;
}

function randomVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function getOnboardingStateForOrg(
  database: typeof db,
  orgId: string,
): Promise<OrgOnboardingSnapshot> {
  const { org, missionBriefing, onboarding } = await loadOrgWithOnboardingState(
    database,
    orgId,
  );

  return {
    org: {
      id: org.id,
      slug: org.slug,
      name: org.name,
      timezone: org.timezone,
      defaultCurrency: org.defaultCurrency,
      stripeCustomerId: org.stripeCustomerId ?? null,
      stripeSubscriptionId: org.stripeSubscriptionId ?? null,
    },
    missionBriefing,
    onboardingState: toPublicState(onboarding),
  };
}

export async function completeOnboardingStepForOrg(
  database: typeof db,
  orgId: string,
  stepId: OnboardingStepId,
  payload?: JsonRecord,
) {
  const { missionBriefing, onboarding } = await loadOrgWithOnboardingState(
    database,
    orgId,
  );

  if (!allPreviousStepsCompleted(onboarding, stepId)) {
    throw new Error(
      `Cannot complete step ${stepId} before previous onboarding steps are completed`,
    );
  }

  const stepKey = onboardingStepKeyFromId(stepId);
  const nowIso = new Date().toISOString();
  const previous = onboarding.steps[stepKey];

  const nextOnboarding: StoredOnboardingState = {
    ...onboarding,
    steps: {
      ...onboarding.steps,
      [stepKey]: {
        completedAt: previous?.completedAt ?? nowIso,
        payload: payload ?? previous?.payload ?? {},
      },
    },
  };

  const allStepsCompleted = ONBOARDING_STEPS.every((step) =>
    Boolean(nextOnboarding.steps[step.key]?.completedAt),
  );

  if (allStepsCompleted) {
    nextOnboarding.completedAt = nextOnboarding.completedAt ?? nowIso;
  }

  const nextMissionBriefing = await persistOnboardingState(
    database,
    orgId,
    missionBriefing,
    nextOnboarding,
  );

  return {
    missionBriefing: nextMissionBriefing,
    onboardingState: toPublicState(nextOnboarding),
  };
}

export async function requestOnboardingPhoneVerificationForOrg(
  database: typeof db,
  orgId: string,
  phoneE164: string,
) {
  const { missionBriefing, onboarding } = await loadOrgWithOnboardingState(
    database,
    orgId,
  );

  const code = randomVerificationCode();
  const now = new Date();

  const nextOnboarding: StoredOnboardingState = {
    ...onboarding,
    phoneVerification: {
      status: "PENDING",
      phoneE164,
      requestedAt: now.toISOString(),
      code,
      codeExpiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      attempts: 0,
    },
  };

  await persistOnboardingState(database, orgId, missionBriefing, nextOnboarding);

  return {
    onboardingState: toPublicState(nextOnboarding),
    debugCode: process.env.NODE_ENV === "production" ? null : code,
  };
}

export async function verifyOnboardingPhoneCodeForOrg(
  database: typeof db,
  orgId: string,
  code: string,
) {
  const { missionBriefing, onboarding } = await loadOrgWithOnboardingState(
    database,
    orgId,
  );

  const phone = onboarding.phoneVerification;
  if (phone.status !== "PENDING") {
    throw new Error("Phone verification has not been requested");
  }

  if (!phone.code || phone.code !== code) {
    throw new Error("Invalid verification code");
  }

  if (phone.codeExpiresAt) {
    const expiresAt = new Date(phone.codeExpiresAt);
    if (Number.isFinite(expiresAt.valueOf()) && expiresAt < new Date()) {
      throw new Error("Verification code has expired");
    }
  }

  const nextOnboarding: StoredOnboardingState = {
    ...onboarding,
    phoneVerification: {
      status: "VERIFIED",
      phoneE164: phone.phoneE164,
      requestedAt: phone.requestedAt,
      verifiedAt: new Date().toISOString(),
      attempts: phone.attempts ?? 0,
    },
  };

  await persistOnboardingState(database, orgId, missionBriefing, nextOnboarding);

  return {
    onboardingState: toPublicState(nextOnboarding),
  };
}

export async function saveMissionBriefingForOrg(
  database: typeof db,
  orgId: string,
  goals: MissionBriefingGoals,
) {
  const { missionBriefing, onboarding } = await loadOrgWithOnboardingState(
    database,
    orgId,
  );

  if (!allPreviousStepsCompleted(onboarding, FINAL_ONBOARDING_STEP)) {
    throw new Error(
      "Cannot complete mission briefing before finishing steps 1 through 5.",
    );
  }

  const nextMissionBriefing: MissionBriefingState = {
    ...missionBriefing,
    goals: {
      ...(missionBriefing.goals ?? {}),
      ...goals,
    },
  };

  const missionStepKey = onboardingStepKeyFromId(FINAL_ONBOARDING_STEP);
  const nowIso = new Date().toISOString();
  const nextOnboarding: StoredOnboardingState = {
    ...onboarding,
    steps: {
      ...onboarding.steps,
      [missionStepKey]: {
        completedAt: onboarding.steps[missionStepKey]?.completedAt ?? nowIso,
        payload: {
          ...(onboarding.steps[missionStepKey]?.payload ?? {}),
          goals,
        },
      },
    },
  };

  if (ONBOARDING_STEPS.every((step) => Boolean(nextOnboarding.steps[step.key]?.completedAt))) {
    nextOnboarding.completedAt = nextOnboarding.completedAt ?? nowIso;
  }

  const persisted = await persistOnboardingState(
    database,
    orgId,
    nextMissionBriefing,
    nextOnboarding,
  );

  return {
    missionBriefing: persisted,
    onboardingState: toPublicState(nextOnboarding),
  };
}

export async function isAutomationUnlockedForOrg(
  database: typeof db,
  orgId: string,
) {
  const snapshot = await getOnboardingStateForOrg(database, orgId);
  return snapshot.onboardingState.isComplete;
}

export async function isPhoneVerifiedForOrg(
  database: typeof db,
  orgId: string,
) {
  const snapshot = await getOnboardingStateForOrg(database, orgId);
  return snapshot.onboardingState.channelUnlocks.sms;
}

export function onboardingStepIdFromStepKey(key: OnboardingStepKey) {
  return onboardingStepIdFromKey(key);
}
