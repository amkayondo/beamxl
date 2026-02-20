import { env } from "@/env";
import { verifyHmacSha256Signature } from "@/lib/crypto";

import type { MessageChannel, WhatsAppAdapter, WhatsAppWebhookEvent } from "./types";

async function sendBirdText(input: {
  apiKey: string;
  toE164: string;
  channel: "whatsapp" | "sms";
  body: string;
}) {
  const response = await fetch("https://api.bird.com/workspaces/current/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: input.toE164,
      channel: input.channel,
      type: "text",
      text: { body: input.body },
    }),
  });

  if (!response.ok) {
    throw new Error(`Bird sendText failed: ${response.status}`);
  }

  const body = (await response.json()) as { id?: string };
  return {
    providerMessageId: body.id ?? `bird_${crypto.randomUUID()}`,
  };
}

function normalizeWebhookChannel(input: unknown): MessageChannel {
  const text = String(input ?? "whatsapp").toLowerCase();
  return text === "sms" ? "SMS" : "WHATSAPP";
}

export class BirdWhatsAppAdapter implements WhatsAppAdapter {
  provider = "BIRD" as const;

  async sendTemplateMessage(input: {
    toE164: string;
    templateKey: string;
    variables: Record<string, string>;
  }) {
    if (!env.BIRD_API_KEY) {
      return {
        providerMessageId: `bird_mock_${crypto.randomUUID()}`,
      };
    }

    const response = await fetch("https://api.bird.com/workspaces/current/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.BIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.toE164,
        channel: "whatsapp",
        type: "template",
        template: {
          key: input.templateKey,
          variables: input.variables,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Bird sendTemplateMessage failed: ${response.status}`);
    }

    const body = (await response.json()) as { id?: string };
    return {
      providerMessageId: body.id ?? `bird_${crypto.randomUUID()}`,
    };
  }

  async sendTextMessage(input: { toE164: string; body: string }) {
    if (!env.BIRD_API_KEY) {
      return {
        providerMessageId: `bird_mock_${crypto.randomUUID()}`,
      };
    }

    return sendBirdText({
      apiKey: env.BIRD_API_KEY,
      toE164: input.toE164,
      channel: "whatsapp",
      body: input.body,
    });
  }

  async sendSmsMessage(input: { toE164: string; body: string }) {
    if (!env.BIRD_API_KEY) {
      return {
        providerMessageId: `bird_mock_${crypto.randomUUID()}`,
      };
    }

    return sendBirdText({
      apiKey: env.BIRD_API_KEY,
      toE164: input.toE164,
      channel: "sms",
      body: input.body,
    });
  }

  async verifyWebhook(input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }) {
    if (!env.BIRD_WEBHOOK_SECRET) return false;

    return verifyHmacSha256Signature({
      payload: input.rawBody,
      secret: env.BIRD_WEBHOOK_SECRET,
      signature: input.signature,
    });
  }

  async parseWebhook(input: { rawBody: string }) {
    const parsed = JSON.parse(input.rawBody) as {
      id?: string;
      type?: string;
      channel?: string;
      message?: {
        id?: string;
        from?: string;
        text?: string;
        channel?: string;
      };
      status?: {
        messageId?: string;
        state?: string;
        channel?: string;
      };
    };

    if (parsed.type === "message.received") {
      const channel = normalizeWebhookChannel(parsed.message?.channel ?? parsed.channel);
      return [
        {
          providerEventId: parsed.id ?? crypto.randomUUID(),
          type: "MESSAGE_INBOUND" as const,
          channel,
          from: parsed.message?.from ?? "",
          body: parsed.message?.text ?? "",
          providerMessageId: parsed.message?.id,
        },
      ] satisfies WhatsAppWebhookEvent[];
    }

    if (parsed.type === "message.status") {
      const state = (parsed.status?.state ?? "").toUpperCase();
      const normalized =
        state === "DELIVERED"
          ? "DELIVERED"
          : state === "READ"
            ? "READ"
            : state === "FAILED"
              ? "FAILED"
              : "SENT";

      if (!parsed.status?.messageId) return [];

      const channel = normalizeWebhookChannel(parsed.status?.channel ?? parsed.channel);

      return [
        {
          providerEventId: parsed.id ?? crypto.randomUUID(),
          type: "MESSAGE_STATUS" as const,
          channel,
          providerMessageId: parsed.status.messageId,
          status: normalized,
        },
      ] satisfies WhatsAppWebhookEvent[];
    }

    return [];
  }
}

export const birdWhatsAppAdapter = new BirdWhatsAppAdapter();
