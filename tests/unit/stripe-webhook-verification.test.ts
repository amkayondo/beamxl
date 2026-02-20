import { beforeAll, describe, expect, it } from "bun:test";
import Stripe from "stripe";

let verifyAndConstructStripeEvent: (input: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}) => Promise<Stripe.Event>;

describe("stripe webhook verification", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET ??= "test-secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    const mod = await import("@/server/services/stripe-webhook.service");
    verifyAndConstructStripeEvent = mod.verifyAndConstructStripeEvent;
  });

  it("constructs event with valid signature", async () => {
    const payload = JSON.stringify({
      id: "evt_test_valid",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_valid" } },
    });
    const secret = "whsec_test_secret";
    const stripe = new Stripe("sk_test_123", { apiVersion: "2025-02-24.acacia" });
    const signature = await stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret,
    });

    const event = await verifyAndConstructStripeEvent({
      rawBody: payload,
      signature,
      webhookSecret: secret,
    });

    expect(event.id).toBe("evt_test_valid");
    expect(event.type).toBe("checkout.session.completed");
  });

  it("throws for invalid signature", async () => {
    const payload = JSON.stringify({
      id: "evt_test_invalid",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_invalid" } },
    });

    await expect(
      verifyAndConstructStripeEvent({
        rawBody: payload,
        signature: "t=123,v1=invalid",
        webhookSecret: "whsec_test_secret",
      })
    ).rejects.toThrow();
  });

  it("throws when secret does not match signature", async () => {
    const payload = JSON.stringify({
      id: "evt_test_wrong_secret",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_wrong_secret" } },
    });
    const stripe = new Stripe("sk_test_123", { apiVersion: "2025-02-24.acacia" });
    const signature = await stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: "whsec_correct",
    });

    await expect(
      verifyAndConstructStripeEvent({
        rawBody: payload,
        signature,
        webhookSecret: "whsec_wrong",
      })
    ).rejects.toThrow();
  });
});
