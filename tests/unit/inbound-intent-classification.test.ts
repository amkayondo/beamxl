import { beforeAll, describe, expect, it } from "vitest";

let classifyInboundIntent: typeof import("@/server/services/inbound-intelligence.service").classifyInboundIntent;

describe("inbound intent classification", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET ??= "inbound-intent-secret";

    const mod = await import("@/server/services/inbound-intelligence.service");
    classifyInboundIntent = mod.classifyInboundIntent;
  });

  it("classifies legal risk phrases", () => {
    expect(classifyInboundIntent("My lawyer will handle this")).toBe("LEGAL_RISK");
  });

  it("classifies dispute phrases", () => {
    expect(classifyInboundIntent("This is the wrong amount")).toBe("DISPUTE");
  });

  it("classifies paid confirmation phrases", () => {
    expect(classifyInboundIntent("I already paid this invoice yesterday")).toBe("PAID");
  });

  it("classifies extension requests", () => {
    expect(classifyInboundIntent("Can I get an extension until Friday?")).toBe("EXTENSION_REQUEST");
  });
});
