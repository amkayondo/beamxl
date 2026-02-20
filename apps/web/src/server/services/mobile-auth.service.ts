import { randomUUID } from "node:crypto";

import { env } from "@/env";
import { safeCompare, signPayloadHmacSha256 } from "@/lib/crypto";

const DEFAULT_MOBILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type MobileSessionTokenPayload = {
  nonce: string;
  userId: string;
  orgId?: string | null;
  issuedAt: number;
  expiresAt: number;
};

function getSigningSecret() {
  const secret = process.env.BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for mobile session tokens");
  }
  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createMobileSessionToken(input: {
  userId: string;
  orgId?: string | null;
  ttlSeconds?: number;
}) {
  const now = Date.now();
  const ttlSeconds = Math.max(60, input.ttlSeconds ?? DEFAULT_MOBILE_TOKEN_TTL_SECONDS);

  const payload: MobileSessionTokenPayload = {
    nonce: randomUUID(),
    userId: input.userId,
    orgId: input.orgId ?? null,
    issuedAt: now,
    expiresAt: now + ttlSeconds * 1000,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayloadHmacSha256(encodedPayload, getSigningSecret());

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: payload.expiresAt,
    ttlSeconds,
  };
}

export function verifyMobileSessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { ok: false as const, reason: "malformed" };

  const expected = signPayloadHmacSha256(encodedPayload, getSigningSecret());
  if (!safeCompare(expected, signature)) return { ok: false as const, reason: "signature" };

  let payload: MobileSessionTokenPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as MobileSessionTokenPayload;
  } catch {
    return { ok: false as const, reason: "parse" };
  }

  if (!payload.userId || payload.expiresAt <= Date.now()) {
    return { ok: false as const, reason: "expired" };
  }

  return { ok: true as const, payload };
}

export function extractBearerToken(headers: Headers) {
  const authorization = headers.get("authorization") ?? headers.get("Authorization");
  if (!authorization) return null;
  if (!authorization.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}
