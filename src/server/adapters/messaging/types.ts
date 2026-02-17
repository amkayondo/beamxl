export type WhatsAppWebhookEvent =
  | {
      providerEventId: string;
      type: "MESSAGE_INBOUND";
      from: string;
      body: string;
      providerMessageId?: string;
    }
  | {
      providerEventId: string;
      type: "MESSAGE_STATUS";
      providerMessageId: string;
      status: "SENT" | "DELIVERED" | "READ" | "FAILED";
    };

export interface WhatsAppAdapter {
  provider: "BIRD";
  sendTemplateMessage(input: {
    toE164: string;
    templateKey: string;
    variables: Record<string, string>;
  }): Promise<{ providerMessageId: string }>;
  sendTextMessage(input: {
    toE164: string;
    body: string;
  }): Promise<{ providerMessageId: string }>;
  verifyWebhook(input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }): Promise<boolean>;
  parseWebhook(input: { rawBody: string }): Promise<WhatsAppWebhookEvent[]>;
}
