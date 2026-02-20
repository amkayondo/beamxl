import { beforeAll, describe, expect, it } from "bun:test";

let runAgentTask: typeof import("@/server/services/ai-runtime.service").runAgentTask;

describe("ai provider fallback", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET ??= "ai-fallback-secret";

    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;

    const mod = await import("@/server/services/ai-runtime.service");
    runAgentTask = mod.runAgentTask;
  });

  it("falls back to mock provider when no providers are configured", async () => {
    const result = await runAgentTask({
      orgId: "org_test",
      taskId: "task_test",
      prompt: "Chase all invoices overdue more than 7 days",
    });

    expect(result.model.provider).toBe("mock");
    expect(result.intent).toBe("CHASE_OVERDUE_INVOICES");
    expect(result.plan).toHaveProperty("orgId", "org_test");
    expect(result.plan).toHaveProperty("taskId", "task_test");
  });
});
