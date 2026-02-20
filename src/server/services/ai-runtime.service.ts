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

type ModelPayload = {
  summary: string;
  intent: string;
  plan: {
    intent: string;
    steps: string[];
    assumptions?: string[];
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

function buildFallbackPlan(prompt: string): ModelPayload {
  const intent = detectIntent(prompt);

  return {
    summary: `Interpreted owner intent as ${intent}.`,
    intent,
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

function tryExtractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as ModelPayload;
  } catch {
    return null;
  }
}

function sanitizeModelPayload(prompt: string, payload: Partial<ModelPayload> | null): ModelPayload {
  const fallback = buildFallbackPlan(prompt);

  if (!payload) return fallback;

  const intent = typeof payload.intent === "string" && payload.intent.length > 0 ? payload.intent : fallback.intent;
  const summary =
    typeof payload.summary === "string" && payload.summary.length > 0
      ? payload.summary
      : fallback.summary;

  const steps = Array.isArray(payload.plan?.steps)
    ? payload.plan.steps.filter((step): step is string => typeof step === "string" && step.length > 0)
    : fallback.plan.steps;

  return {
    summary,
    intent,
    plan: {
      intent,
      steps: steps.length > 0 ? steps : fallback.plan.steps,
      assumptions: Array.isArray(payload.plan?.assumptions)
        ? payload.plan?.assumptions.filter(
            (item): item is string => typeof item === "string" && item.length > 0
          )
        : undefined,
    },
  };
}

function buildPromptContract(prompt: string) {
  return [
    "You are DueFlow's collections agent planner.",
    "Return valid JSON only.",
    "JSON schema:",
    '{"summary":"string","intent":"UPPER_SNAKE_CASE","plan":{"intent":"UPPER_SNAKE_CASE","steps":["string"],"assumptions":["string"]}}',
    "Task:",
    prompt,
  ].join("\n");
}

async function callOpenAi(prompt: string): Promise<ModelResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const traceId = crypto.randomUUID();
  const model = "gpt-5-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildPromptContract(prompt),
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const rawText =
    data.output_text ??
    data.output?.flatMap((entry) => entry.content ?? []).find((item) => item.type === "output_text")
      ?.text ??
    "";

  const payload = sanitizeModelPayload(prompt, tryExtractJsonObject(rawText));

  return {
    provider: "openai",
    model,
    traceId,
    summary: payload.summary,
    intent: payload.intent,
    plan: payload.plan,
  };
}

async function callAnthropic(prompt: string): Promise<ModelResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const traceId = crypto.randomUUID();
  const model = "claude-3-7-sonnet-latest";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: "user", content: buildPromptContract(prompt) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const rawText = data.content?.find((item) => item.type === "text")?.text ?? "";
  const payload = sanitizeModelPayload(prompt, tryExtractJsonObject(rawText));

  return {
    provider: "anthropic",
    model,
    traceId,
    summary: payload.summary,
    intent: payload.intent,
    plan: payload.plan,
  };
}

async function callGoogle(prompt: string): Promise<ModelResult> {
  if (!env.GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const traceId = crypto.randomUUID();
  const model = "gemini-2.0-flash";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_AI_API_KEY}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildPromptContract(prompt) }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google AI request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const payload = sanitizeModelPayload(prompt, tryExtractJsonObject(rawText));

  return {
    provider: "google",
    model,
    traceId,
    summary: payload.summary,
    intent: payload.intent,
    plan: payload.plan,
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
      // try next provider in chain
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
