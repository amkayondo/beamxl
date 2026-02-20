import { randomUUID } from "node:crypto";

import { env } from "@/env";
import { safeCompare, signPayloadHmacSha256 } from "@/lib/crypto";

export const STRIPE_OAUTH_STATE_COOKIE = "beamflow_stripe_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

export type StripeOAuthStatePayload = {
  nonce: string;
  orgId: string;
  orgSlug: string;
  userId: string;
  expiresAt: number;
};

function getSigningSecret() {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for Stripe OAuth state");
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createSignedStripeOAuthState(input: {
  orgId: string;
  orgSlug: string;
  userId: string;
}) {
  const nonce = randomUUID();
  const payload: StripeOAuthStatePayload = {
    nonce,
    orgId: input.orgId,
    orgSlug: input.orgSlug,
    userId: input.userId,
    expiresAt: Date.now() + STATE_TTL_SECONDS * 1000,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayloadHmacSha256(encodedPayload, getSigningSecret());

  return {
    state: nonce,
    cookieValue: `${encodedPayload}.${signature}`,
    maxAgeSeconds: STATE_TTL_SECONDS,
  };
}

export function verifySignedStripeOAuthState(input: {
  cookieValue?: string | null;
  state?: string | null;
  userId: string;
}) {
  if (!input.cookieValue || !input.state) {
    return { ok: false as const, reason: "missing" };
  }

  const [encodedPayload, signature] = input.cookieValue.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false as const, reason: "malformed" };
  }

  const expected = signPayloadHmacSha256(encodedPayload, getSigningSecret());
  if (!safeCompare(expected, signature)) {
    return { ok: false as const, reason: "signature" };
  }

  let payload: StripeOAuthStatePayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as StripeOAuthStatePayload;
  } catch {
    return { ok: false as const, reason: "parse" };
  }

  if (payload.expiresAt < Date.now()) {
    return { ok: false as const, reason: "expired" };
  }

  if (payload.nonce !== input.state) {
    return { ok: false as const, reason: "state-mismatch" };
  }

  if (payload.userId !== input.userId) {
    return { ok: false as const, reason: "user-mismatch" };
  }

  return { ok: true as const, payload };
}
