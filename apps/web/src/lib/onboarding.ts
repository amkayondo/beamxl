export const ONBOARDING_STEPS = [
  {
    id: 1,
    key: "BUSINESS_PROFILE",
    title: "Business profile",
    description: "Set business name, type, and timezone.",
  },
  {
    id: 2,
    key: "STRIPE_CONNECT",
    title: "Connect Stripe",
    description: "Connect your Stripe account for payment links.",
  },
  {
    id: 3,
    key: "FIRST_INVOICE",
    title: "First invoice",
    description: "Import or create your first invoice.",
  },
  {
    id: 4,
    key: "FIRST_WORKFLOW",
    title: "First workflow",
    description: "Set up your first workflow from a template.",
  },
  {
    id: 5,
    key: "FIRST_REMINDER",
    title: "First reminder",
    description: "Send your first reminder to reach the aha moment.",
  },
  {
    id: 6,
    key: "MISSION_BRIEFING",
    title: "Mission briefing",
    description: "Set goals, tone, and owner notification preferences.",
  },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export const FINAL_ONBOARDING_STEP: OnboardingStepId = 6;

export type OnboardingStepStatus = "LOCKED" | "AVAILABLE" | "COMPLETED";

const stepKeyById = new Map<OnboardingStepId, OnboardingStepKey>(
  ONBOARDING_STEPS.map((step) => [step.id, step.key]),
);

const stepIdByKey = new Map<OnboardingStepKey, OnboardingStepId>(
  ONBOARDING_STEPS.map((step) => [step.key, step.id]),
);

export function onboardingStepKeyFromId(id: OnboardingStepId): OnboardingStepKey {
  const key = stepKeyById.get(id);
  if (!key) {
    throw new Error(`Unknown onboarding step id: ${id}`);
  }

  return key;
}

export function onboardingStepIdFromKey(key: OnboardingStepKey): OnboardingStepId {
  const id = stepIdByKey.get(key);
  if (!id) {
    throw new Error(`Unknown onboarding step key: ${key}`);
  }

  return id;
}
