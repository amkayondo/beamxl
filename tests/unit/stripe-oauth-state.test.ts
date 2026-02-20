import { beforeAll, describe, expect, it } from "bun:test";

import { signPayloadHmacSha256 } from "@/lib/crypto";

let createSignedStripeOAuthState: (input: {
  orgId: string;
  orgSlug: string;
  userId: string;
}) => {
  state: string;
  cookieValue: string;
  maxAgeSeconds: number;
};
let verifySignedStripeOAuthState: (input: {
  cookieValue?: string | null;
  state?: string | null;
  userId: string;
}) =>
  | { ok: false; reason: string }
  | {
      ok: true;
      payload: {
        nonce: string;
        orgId: string;
        orgSlug: string;
        userId: string;
        expiresAt: number;
      };
    };

describe("stripe oauth state", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET = "oauth-state-secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    const mod = await import("@/server/services/stripe-oauth-state");
    createSignedStripeOAuthState = mod.createSignedStripeOAuthState;
    verifySignedStripeOAuthState = mod.verifySignedStripeOAuthState;
  });

  it("creates and verifies a valid state payload", () => {
    const signed = createSignedStripeOAuthState({
      orgId: "org_test",
      orgSlug: "test-org",
      userId: "user_test",
    });

    const result = verifySignedStripeOAuthState({
      cookieValue: signed.cookieValue,
      state: signed.state,
      userId: "user_test",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.orgId).toBe("org_test");
      expect(result.payload.orgSlug).toBe("test-org");
      expect(result.payload.userId).toBe("user_test");
    }
  });

  it("rejects a tampered payload", () => {
    const signed = createSignedStripeOAuthState({
      orgId: "org_test",
      orgSlug: "test-org",
      userId: "user_test",
    });

    const [encodedPayload, signature] = signed.cookieValue.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload!, "base64url").toString("utf8")
    ) as {
      nonce: string;
      orgId: string;
      orgSlug: string;
      userId: string;
      expiresAt: number;
    };

    payload.orgId = "org_tampered";
    const tamperedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url"
    );

    const result = verifySignedStripeOAuthState({
      cookieValue: `${tamperedPayload}.${signature}`,
      state: signed.state,
      userId: "user_test",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects expired state payload", () => {
    const expiredPayload = {
      nonce: "nonce_expired",
      orgId: "org_test",
      orgSlug: "test-org",
      userId: "user_test",
      expiresAt: Date.now() - 1000,
    };
    const encodedPayload = Buffer.from(
      JSON.stringify(expiredPayload),
      "utf8"
    ).toString("base64url");
    const signature = signPayloadHmacSha256(
      encodedPayload,
      process.env.BETTER_AUTH_SECRET!
    );

    const result = verifySignedStripeOAuthState({
      cookieValue: `${encodedPayload}.${signature}`,
      state: "nonce_expired",
      userId: "user_test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("expired");
    }
  });
});
