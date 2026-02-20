import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import {
  auditActorTypeEnum,
  callOutcomeEnum,
  callStatusEnum,
  channelEnum,
  deliveryStatusEnum,
  messageDirectionEnum,
} from "./enums";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { invoices } from "./invoices";
import { orgs } from "./organizations";
import { user } from "./users";

export const messageLogs = createTable(
  "message_logs",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    conversationId: d
      .text("conversation_id")
      .references(() => conversations.id, { onDelete: "set null" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    direction: messageDirectionEnum("direction").notNull(),
    channel: channelEnum("channel").notNull().default("WHATSAPP"),
    provider: d.text("provider").notNull().default("BIRD"),
    providerMessageId: d.text("provider_message_id"),
    templateKey: d.text("template_key"),
    templateVersion: d.integer("template_version"),
    body: d.text("body").notNull(),
    deliveryStatus: deliveryStatusEnum("delivery_status")
      .notNull()
      .default("QUEUED"),
    failureReason: d.text("failure_reason"),
    sentAt: d.timestamp("sent_at", { withTimezone: true }),
    deliveredAt: d.timestamp("delivered_at", { withTimezone: true }),
    readAt: d.timestamp("read_at", { withTimezone: true }),
    receivedAt: d.timestamp("received_at", { withTimezone: true }),
    metadata: d.jsonb("metadata"),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    uniqueIndex("beamflow_message_logs_provider_message_uidx").on(
      t.providerMessageId
    ),
    index("beamflow_message_logs_org_contact_created_idx").on(
      t.orgId,
      t.contactId,
      t.createdAt
    ),
    index("beamflow_message_logs_conversation_created_idx").on(
      t.conversationId,
      t.createdAt
    ),
  ]
);

export const callLogs = createTable(
  "call_logs",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    conversationId: d.text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    provider: d.text("provider").notNull(),
    providerCallId: d.text("provider_call_id"),
    status: callStatusEnum("status").notNull().default("QUEUED"),
    outcome: callOutcomeEnum("outcome"),
    durationSec: d.integer("duration_sec"),
    transcript: d.text("transcript"),
    summary: d.text("summary"),
    recordingUrl: d.text("recording_url"),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    uniqueIndex("beamflow_call_logs_provider_call_uidx").on(t.providerCallId),
    index("beamflow_call_logs_org_status_idx").on(t.orgId, t.status),
  ]
);

export const auditLogs = createTable(
  "audit_logs",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorUserId: d.text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: d.text("action").notNull(),
    entityType: d.text("entity_type").notNull(),
    entityId: d.text("entity_id").notNull(),
    correlationId: d.text("correlation_id"),
    before: d.jsonb("before"),
    after: d.jsonb("after"),
    ipHash: d.text("ip_hash"),
    userAgentHash: d.text("user_agent_hash"),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [index("beamflow_audit_logs_org_created_idx").on(t.orgId, t.createdAt)]
);
