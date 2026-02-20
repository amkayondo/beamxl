import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { disputeStatusEnum, legalRiskSeverityEnum } from "./enums";
import { contacts } from "./contacts";
import { invoices } from "./invoices";
import { orgs } from "./organizations";
import { payments } from "./payments";
import { user } from "./users";

export const disputes = createTable(
  "disputes",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    invoiceId: d
      .text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    status: disputeStatusEnum("status").notNull().default("OPEN"),
    reason: d.text("reason").notNull(),
    details: d.text("details"),
    evidence: d.jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
    openedAt: d
      .timestamp("opened_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    resolvedAt: d.timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: d.text("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolutionSummary: d.text("resolution_summary"),
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
    index("beamflow_disputes_org_status_idx").on(t.orgId, t.status),
    index("beamflow_disputes_org_invoice_idx").on(t.orgId, t.invoiceId),
  ]
);

export const disputeEvents = createTable(
  "dispute_events",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    disputeId: d
      .text("dispute_id")
      .notNull()
      .references(() => disputes.id, { onDelete: "cascade" }),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    eventType: d.text("event_type").notNull(),
    actorType: d.text("actor_type").notNull().default("SYSTEM"),
    actorUserId: d.text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    payload: d.jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_dispute_events_dispute_idx").on(t.disputeId),
    index("beamflow_dispute_events_org_created_idx").on(t.orgId, t.createdAt),
  ]
);

export const legalRiskFlags = createTable(
  "legal_risk_flags",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    contactId: d.text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    source: d.text("source").notNull(),
    severity: legalRiskSeverityEnum("severity").notNull().default("MEDIUM"),
    triggerText: d.text("trigger_text"),
    note: d.text("note"),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    isResolved: d.boolean("is_resolved").notNull().default(false),
    resolvedAt: d.timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: d.text("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
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
    index("beamflow_legal_risk_flags_org_resolved_idx").on(t.orgId, t.isResolved),
    index("beamflow_legal_risk_flags_org_severity_idx").on(t.orgId, t.severity),
  ]
);

export const chargebackEvents = createTable(
  "chargeback_events",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    paymentId: d.text("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    providerEventId: d.text("provider_event_id").notNull(),
    status: d.text("status").notNull(),
    amountMinor: d.integer("amount_minor"),
    currency: d.text("currency"),
    payload: d.jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    occurredAt: d
      .timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    uniqueIndex("beamflow_chargeback_provider_event_uidx").on(t.providerEventId),
    index("beamflow_chargeback_org_occurred_idx").on(t.orgId, t.occurredAt),
  ]
);
