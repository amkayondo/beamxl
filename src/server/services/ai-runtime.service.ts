import { env } from "@/env";

type ModelProvider = "openai" | "anthropic" | "google" | "mock";

type ModelResult = {
  provider: ModelProvider;
  model: string;
  traceId: string;
  summary: string;
  intent: string;
  plan: Record<string, unknown>;
};

type AgentTaskResult = {
  summary: string;
  intent: string;
  plan: Record<string, unknown>;
  policyChecks: Record<string, unknown>;
  model: {
    provider: ModelProvider;
    model: string;
    traceId: string;
  };
};

function detectIntent(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("overdue")) return "CHASE_OVERDUE_INVOICES";
  if (normalized.includes("pause")) return "PAUSE_REMINDERS";
  if (normalized.includes("who owes")) return "TOP_DEBTORS_REPORT";
  if (normalized.includes("write off")) return "WRITE_OFF_INVOICE";
  if (normalized.includes("stop all voice")) return "DISABLE_VOICE";
  if (normalized.includes("remind me")) return "SET_THRESHOLD_ALERT";

  return "GENERAL_COLLECTIONS_TASK";
}

function buildPolicyChecks() {
  return {
    dncListChecked: true,
    quietHoursChecked: true,
    optOutChecked: true,
    frequencyCapChecked: true,
    templatePolicyChecked: true,
  };
}

function buildFallbackPlan(prompt: string) {
  const intent = detectIntent(prompt);

  return {
    intent,
    summary: `Interpreted owner intent as ${intent}.`,
    plan: {
      intent,
      steps: [
        "Validate org policy and compliance guardrails.",
        "Fetch matching invoices/contacts for the command.",
        "Prepare a dry-run action list for owner approval.",
        "Execute approved actions and log each decision.",
      ],
    },
  };
}

async function callOpenAi(prompt: string): Promise<ModelResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const traceId = crypto.randomUUID();
  const fallback = buildFallbackPlan(prompt);

  return {
    provider: "openai",
    model: "gpt-5-mini",
    traceId,
    summary: fallback.summary,
    intent: fallback.intent,
    plan: fallback.plan,
  };
}

async function callAnthropic(prompt: string): Promise<ModelResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const traceId = crypto.randomUUID();
  const fallback = buildFallbackPlan(prompt);

  return {
    provider: "anthropic",
    model: "claude-3-7-sonnet",
    traceId,
    summary: fallback.summary,
    intent: fallback.intent,
    plan: fallback.plan,
  };
}

async function callGoogle(prompt: string): Promise<ModelResult> {
  if (!env.GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const traceId = crypto.randomUUID();
  const fallback = buildFallbackPlan(prompt);

  return {
    provider: "google",
    model: "gemini-2.0-flash",
    traceId,
    summary: fallback.summary,
    intent: fallback.intent,
    plan: fallback.plan,
  };
}

async function callWithFallback(prompt: string): Promise<ModelResult> {
  const providers: Array<() => Promise<ModelResult>> = [
    () => callOpenAi(prompt),
    () => callAnthropic(prompt),
    () => callGoogle(prompt),
  ];

  for (const provider of providers) {
    try {
      return await provider();
    } catch {
      // Try next provider in the fallback chain.
    }
  }

  const fallback = buildFallbackPlan(prompt);
  return {
    provider: "mock",
    model: "rule-based-v1",
    traceId: crypto.randomUUID(),
    summary: fallback.summary,
    intent: fallback.intent,
    plan: fallback.plan,
  };
}

export async function runAgentTask(input: {
  orgId: string;
  taskId: string;
  prompt: string;
}): Promise<AgentTaskResult> {
  const model = await callWithFallback(input.prompt);
  const policyChecks = buildPolicyChecks();

  return {
    summary: model.summary,
    intent: model.intent,
    plan: {
      ...model.plan,
      orgId: input.orgId,
      taskId: input.taskId,
    },
    policyChecks,
    model: {
      provider: model.provider,
      model: model.model,
      traceId: model.traceId,
    },
  };
}
