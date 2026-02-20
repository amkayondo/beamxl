export type CallWebhookEvent = {
  providerEventId: string;
  providerCallId?: string;
  type: "CALL_COMPLETED" | "CALL_FAILED" | "CALL_STATUS";
  status?:
    | "QUEUED"
    | "RINGING"
    | "ANSWERED"
    | "NO_ANSWER"
    | "BUSY"
    | "FAILED"
    | "COMPLETED";
  outcome?: "PROMISE_TO_PAY" | "CALLBACK" | "VOICEMAIL" | "FAILED" | "NO_RESPONSE";
  transcript?: string;
  summary?: string;
  raw: unknown;
};

export interface CallAdapter {
  provider: "TWILIO" | "BIRD";
  placeCall(input: {
    toE164: string;
    scriptText: string;
    metadata: Record<string, string>;
  }): Promise<{ providerCallId: string }>;
  verifyWebhook(input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }): Promise<boolean>;
  parseWebhook(input: { rawBody: string }): Promise<CallWebhookEvent>;
}
