import { beforeAll, describe, expect, it } from "bun:test";

let classifyInboundIntent: typeof import("@/server/services/inbound-intelligence.service").classifyInboundIntent;

describe("already paid branch", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET ??= "already-paid-branch-secret";

    const mod = await import("@/server/services/inbound-intelligence.service");
    classifyInboundIntent = mod.classifyInboundIntent;
  });

  it("classifies already-paid confirmations into the PAID branch", () => {
    expect(classifyInboundIntent("I already paid invoice 1089 this morning")).toBe("PAID");
    expect(classifyInboundIntent("Payment sent yesterday, paid already")).toBe("PAID");
  });
});
