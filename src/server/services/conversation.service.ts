import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { contacts, conversations, messageLogs } from "@/server/db/schema";
import { birdWhatsAppAdapter } from "@/server/adapters/messaging/bird.adapter";

async function ensureConversation(input: {
  orgId: string;
  contactId: string;
  channel?: "WHATSAPP" | "VOICE";
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
}) {
  const contact = await db.query.contacts.findFirst({
    where: (c, { and, eq }) =>
      and(eq(c.id, input.contactId), eq(c.orgId, input.orgId)),
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  const conversation = await ensureConversation({
    orgId: input.orgId,
    contactId: input.contactId,
    channel: "WHATSAPP",
  });

  const providerMessage = await birdWhatsAppAdapter.sendTextMessage({
    toE164: contact.phoneE164,
    body: input.body,
  });

  const messageLogId = crypto.randomUUID();

  await db.insert(messageLogs).values({
    id: messageLogId,
    orgId: input.orgId,
    conversationId: conversation.id,
    contactId: input.contactId,
    invoiceId: input.invoiceId ?? null,
    direction: "OUTBOUND",
    channel: "WHATSAPP",
    provider: "BIRD",
    providerMessageId: providerMessage.providerMessageId,
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
    providerMessageId: providerMessage.providerMessageId,
  };
}

export async function recordInboundMessage(input: {
  orgId: string;
  fromPhone: string;
  body: string;
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
    channel: "WHATSAPP",
  });

  await db.insert(messageLogs).values({
    orgId: input.orgId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "INBOUND",
    channel: "WHATSAPP",
    provider: "BIRD",
    providerMessageId: input.providerMessageId,
    body: input.body,
    deliveryStatus: "RECEIVED",
    receivedAt: new Date(),
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

export async function listConversations(input: {
  orgId: string;
  status?: "OPEN" | "PENDING" | "CLOSED";
  page: number;
  pageSize: number;
}) {
  const offset = (input.page - 1) * input.pageSize;

  const whereFn = input.status
    ? and(eq(conversations.orgId, input.orgId), eq(conversations.status, input.status))
    : eq(conversations.orgId, input.orgId);

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
