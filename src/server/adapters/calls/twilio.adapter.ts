import type { CallAdapter } from "./types";

export class TwilioCallAdapter implements CallAdapter {
  provider = "TWILIO" as const;

  async placeCall(input: {
    toE164: string;
    scriptText: string;
    metadata: Record<string, string>;
  }) {
    return {
      providerCallId: `twilio_mock_${crypto.randomUUID()}`,
    };
  }

  async verifyWebhook(_input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }) {
    return false;
  }

  async parseWebhook(input: { rawBody: string }) {
    const raw = JSON.parse(input.rawBody) as Record<string, unknown>;
    return {
      providerEventId: String(raw.id ?? crypto.randomUUID()),
      providerCallId: raw.callId as string | undefined,
      type: "CALL_STATUS" as const,
      status: "COMPLETED" as const,
      outcome: undefined,
      transcript: undefined,
      summary: undefined,
      raw,
    };
  }
}

export const twilioCallAdapter = new TwilioCallAdapter();
