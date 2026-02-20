import { beforeAll, describe, expect, it } from "bun:test";

let shouldProcessStripeWebhookEvent: (
  existing: { processedAt: Date | null; status: string } | null
) => boolean;

describe("stripe webhook idempotency", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/beamflow";
    process.env.BETTER_AUTH_SECRET ??= "idempotency-secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    const mod = await import("@/server/services/stripe-webhook.service");
    shouldProcessStripeWebhookEvent = mod.shouldProcessStripeWebhookEvent;
  });

  it("processes when no event record exists", () => {
    expect(shouldProcessStripeWebhookEvent(null)).toBe(true);
  });

  it("processes when event exists but is not processed", () => {
    expect(
      shouldProcessStripeWebhookEvent({
        status: "RECEIVED",
        processedAt: null,
      })
    ).toBe(true);
  });

  it("short-circuits when event is already processed", () => {
    expect(
      shouldProcessStripeWebhookEvent({
        status: "PROCESSED",
        processedAt: new Date(),
      })
    ).toBe(false);
  });
});
