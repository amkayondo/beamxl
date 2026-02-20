import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { callLogs, contacts, conversations, messageLogs } from "@/server/db/schema";
import { birdWhatsAppAdapter } from "@/server/adapters/messaging/bird.adapter";
import { resendEmailAdapter } from "@/server/adapters/messaging/resend-email.adapter";
import { checkComplianceForOutbound } from "@/server/services/compliance.service";
import { processInboundIntent } from "@/server/services/inbound-intelligence.service";
import { enforceAndRecordUsage } from "@/server/services/usage-credits.service";

async function ensureConversation(input: {
  orgId: string;
  contactId: string;
  channel?: "WHATSAPP" | "VOICE" | "EMAIL" | "SMS";
}) {
  const existing = await db.query.conversations.findFirst({
    where: (c, { and, eq }) =>
      and(
        eq(c.orgId, input.orgId),
        eq(c.contactId, input.contactId),
        eq(c.channel, input.channel ?? "WHATSAPP")
      ),
  });

  if (existing) return existing;

  const id = crypto.randomUUID();
  await db.insert(conversations).values({
    id,
    orgId: input.orgId,
    contactId: input.contactId,
    channel: input.channel ?? "WHATSAPP",
    status: "OPEN",
    unreadCount: 0,
  });

  const created = await db.query.conversations.findFirst({
    where: (c, { eq }) => eq(c.id, id),
  });

  if (!created) throw new Error("Failed to create conversation");
  return created;
}

export async function sendConversationMessage(input: {
  orgId: string;
  contactId: string;
  invoiceId?: string;
  body: string;
  channel?: "WHATSAPP" | "EMAIL" | "SMS";
  emailSubject?: string;
  emailHtml?: string;
}) {
  const channel = input.channel ?? "WHATSAPP";

  const contact = await db.query.contacts.findFirst({
    where: (c, { and, eq }) =>
      and(eq(c.id, input.contactId), eq(c.orgId, input.orgId)),
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Compliance gate — block outbound if not allowed
  const compliance = await checkComplianceForOutbound({
    orgId: input.orgId,
    contactId: input.contactId,
    channel,
  });

  if (!compliance.allowed) {
    throw new Error(
      `Compliance blocked: ${compliance.reason ?? "Message not allowed"}`,
    );
  }

  await enforceAndRecordUsage({
    orgId: input.orgId,
    channel: channel === "EMAIL" ? "EMAIL" : channel === "SMS" ? "SMS" : "WHATSAPP",
    units: 1,
  });

  const conversation = await ensureConversation({
    orgId: input.orgId,
    contactId: input.contactId,
    channel,
  });

  let providerMessageId: string;
  let logChannel: "WHATSAPP" | "EMAIL" | "SMS";
  let logProvider: string;

  if (channel === "EMAIL") {
    // --- Email path ---
    if (!contact.email) {
      throw new Error("Contact has no email address");
    }

    const emailResult = await resendEmailAdapter.sendEmail({
      to: contact.email,
      subject: input.emailSubject ?? "Payment Reminder",
      html: input.emailHtml ?? input.body,
      text: input.body,
    });

    providerMessageId = emailResult.providerMessageId;
    logChannel = "EMAIL";
    logProvider = "RESEND";
  } else if (channel === "SMS") {
    const providerMessage = await birdWhatsAppAdapter.sendSmsMessage({
      toE164: contact.phoneE164,
      body: input.body,
    });

    providerMessageId = providerMessage.providerMessageId;
    logChannel = "SMS";
    logProvider = "BIRD";
  } else {
    // --- WhatsApp path (default) ---
    const providerMessage = await birdWhatsAppAdapter.sendTextMessage({
      toE164: contact.phoneE164,
      body: input.body,
    });

    providerMessageId = providerMessage.providerMessageId;
    logChannel = "WHATSAPP";
    logProvider = "BIRD";
  }

  const messageLogId = crypto.randomUUID();

  await db.insert(messageLogs).values({
    id: messageLogId,
    orgId: input.orgId,
    conversationId: conversation.id,
    contactId: input.contactId,
    invoiceId: input.invoiceId ?? null,
    direction: "OUTBOUND",
    channel: logChannel,
    provider: logProvider,
    providerMessageId,
    body: input.body,
    deliveryStatus: "SENT",
    sentAt: new Date(),
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversation.id));

  return {
    messageLogId,
    providerMessageId,
  };
}

export async function recordInboundMessage(input: {
  orgId: string;
  fromPhone: string;
  body: string;
  channel?: "WHATSAPP" | "SMS";
  providerMessageId?: string;
}) {
  const contact = await db.query.contacts.findFirst({
    where: (c, { and, eq }) =>
      and(eq(c.orgId, input.orgId), eq(c.phoneE164, input.fromPhone)),
  });

  if (!contact) return null;

  const conversation = await ensureConversation({
    orgId: input.orgId,
    contactId: contact.id,
    channel: input.channel ?? "WHATSAPP",
  });

  const messageLogId = crypto.randomUUID();
  await db.insert(messageLogs).values({
    id: messageLogId,
    orgId: input.orgId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "INBOUND",
    channel: input.channel ?? "WHATSAPP",
    provider: "BIRD",
    providerMessageId: input.providerMessageId,
    body: input.body,
    deliveryStatus: "RECEIVED",
    receivedAt: new Date(),
  });

  const intentResult = await processInboundIntent({
    orgId: input.orgId,
    contactId: contact.id,
    messageLogId,
    body: input.body,
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      unreadCount: sql`${conversations.unreadCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversation.id));

  await db
    .update(contacts)
    .set({
      lastInboundAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contact.id));

  return {
    contactId: contact.id,
    conversationId: conversation.id,
    intent: intentResult.intent,
    escalated: intentResult.escalated,
  };
}

export async function listConversationMessages(input: {
  orgId: string;
  contactId: string;
}) {
  return db.query.messageLogs.findMany({
    where: (m, { and, eq }) =>
      and(eq(m.orgId, input.orgId), eq(m.contactId, input.contactId)),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

export async function listConversationTimeline(input: {
  orgId: string;
  contactId: string;
}) {
  const [messages, calls] = await Promise.all([
    db.query.messageLogs.findMany({
      where: (m, { and, eq }) =>
        and(eq(m.orgId, input.orgId), eq(m.contactId, input.contactId)),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    }),
    db.query.callLogs.findMany({
      where: (c, { and, eq }) =>
        and(eq(c.orgId, input.orgId), eq(c.contactId, input.contactId)),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    }),
  ]);

  const timeline = [
    ...messages.map((item) => ({
      type: "MESSAGE" as const,
      timestamp: item.createdAt,
      item,
    })),
    ...calls.map((item) => ({
      type: "CALL" as const,
      timestamp: item.createdAt,
      item,
    })),
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return timeline;
}

export async function listConversations(input: {
  orgId: string;
  status?: "OPEN" | "PENDING" | "CLOSED";
  channel?: "WHATSAPP" | "SMS" | "EMAIL" | "VOICE";
  page: number;
  pageSize: number;
}) {
  const offset = (input.page - 1) * input.pageSize;

  const whereFn = input.status
    ? and(
        eq(conversations.orgId, input.orgId),
        eq(conversations.status, input.status),
        input.channel ? eq(conversations.channel, input.channel) : undefined
      )
    : and(
        eq(conversations.orgId, input.orgId),
        input.channel ? eq(conversations.channel, input.channel) : undefined
      );

  const [items, countResult] = await Promise.all([
    db.query.conversations.findMany({
      where: whereFn,
      orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
      offset,
      limit: input.pageSize,
      with: {
        contact: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(whereFn),
  ]);

  return {
    items,
    total: Number(countResult[0]?.count ?? 0),
  };
}
