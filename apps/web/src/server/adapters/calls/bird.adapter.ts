import { env } from "@/env";
import { verifyHmacSha256Signature } from "@/lib/crypto";

import type { CallAdapter } from "./types";

export class BirdCallAdapter implements CallAdapter {
  provider = "BIRD" as const;

  async placeCall(input: {
    toE164: string;
    scriptText: string;
    metadata: Record<string, string>;
  }) {
    if (!env.BIRD_API_KEY) {
      return {
        providerCallId: `bird_call_mock_${crypto.randomUUID()}`,
      };
    }

    const response = await fetch("https://api.bird.com/workspaces/current/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.BIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.toE164,
        script: input.scriptText,
        metadata: input.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bird placeCall failed: ${response.status}`);
    }

    const body = (await response.json()) as { id?: string };
    return {
      providerCallId: body.id ?? `bird_call_${crypto.randomUUID()}`,
    };
  }

  async verifyWebhook(input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }) {
    if (!env.BIRD_WEBHOOK_SECRET) return false;
    if (!input.signature) return false;

    return verifyHmacSha256Signature({
      payload: input.rawBody,
      secret: env.BIRD_WEBHOOK_SECRET,
      signature: input.signature,
    });
  }

  async parseWebhook(input: { rawBody: string }) {
    const raw = JSON.parse(input.rawBody) as Record<string, unknown>;
    const statusRaw = String(raw.status ?? "COMPLETED").toUpperCase();

    const status: NonNullable<
      Awaited<ReturnType<CallAdapter["parseWebhook"]>>["status"]
    > =
      statusRaw === "QUEUED" ||
      statusRaw === "RINGING" ||
      statusRaw === "ANSWERED" ||
      statusRaw === "NO_ANSWER" ||
      statusRaw === "BUSY" ||
      statusRaw === "FAILED" ||
      statusRaw === "COMPLETED"
        ? statusRaw
        : "COMPLETED";

    return {
      providerEventId: String(raw.id ?? crypto.randomUUID()),
      providerCallId: (raw.callId as string | undefined) ?? (raw.call_id as string | undefined),
      type: "CALL_STATUS" as const,
      status,
      outcome: undefined,
      transcript: (raw.transcript as string | undefined) ?? undefined,
      summary: (raw.summary as string | undefined) ?? undefined,
      raw,
    };
  }
}

export const birdCallAdapter = new BirdCallAdapter();
