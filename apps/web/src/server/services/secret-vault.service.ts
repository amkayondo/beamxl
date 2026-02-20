import { env } from "@/env";

export function ensureEnvRefSecretStrategy() {
  if (env.INTEGRATION_SECRET_STRATEGY !== "env-ref") {
    throw new Error("Unsupported integration secret strategy");
  }
}

export function readSecretFromEnvRef(secretKeyRef?: string | null) {
  if (!secretKeyRef) return null;
  const value = process.env[secretKeyRef];
  return value ?? null;
}

export function normalizeSecretRef(input: {
  provider: string;
  secretKeyRef?: string;
}) {
  if (input.secretKeyRef?.trim()) {
    return input.secretKeyRef.trim();
  }

  const sanitized = input.provider.replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
  return `${sanitized}_API_KEY`;
}
