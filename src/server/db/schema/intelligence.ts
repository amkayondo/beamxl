import { sql } from "drizzle-orm";
import { index, unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { billingChannelEnum, invoiceHealthEnum, riskLevelEnum } from "./enums";
import { contacts } from "./contacts";
import { invoices } from "./invoices";
import { orgs } from "./organizations";

export const clientRiskScores = createTable(
  "client_risk_scores",
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
    riskLevel: riskLevelEnum("risk_level").notNull(),
    score: d.integer("score").notNull(),
    factors: d.jsonb("factors").notNull().default(sql`'{}'::jsonb`),
    computedAt: d
      .timestamp("computed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    unique("beamflow_client_risk_scores_org_contact_computed_uq").on(
      t.orgId,
      t.contactId,
      t.computedAt
    ),
    index("beamflow_client_risk_scores_org_level_idx").on(t.orgId, t.riskLevel),
  ]
);

export const invoiceHealthScores = createTable(
  "invoice_health_scores",
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
    health: invoiceHealthEnum("health").notNull(),
    score: d.integer("score").notNull(),
    predictedPaidAt: d.timestamp("predicted_paid_at", { withTimezone: true }),
    modelVersion: d.text("model_version").notNull().default("v1"),
    factors: d.jsonb("factors").notNull().default(sql`'{}'::jsonb`),
    computedAt: d
      .timestamp("computed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    unique("beamflow_invoice_health_scores_org_invoice_computed_uq").on(
      t.orgId,
      t.invoiceId,
      t.computedAt
    ),
    index("beamflow_invoice_health_scores_org_health_idx").on(t.orgId, t.health),
  ]
);

export const forecastSnapshots = createTable(
  "forecast_snapshots",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    horizonDays: d.integer("horizon_days").notNull(),
    projectedCollectionsMinor: d.integer("projected_collections_minor").notNull(),
    atRiskMinor: d.integer("at_risk_minor").notNull().default(0),
    modelVersion: d.text("model_version").notNull().default("v1"),
    breakdown: d.jsonb("breakdown").notNull().default(sql`'{}'::jsonb`),
    generatedAt: d
      .timestamp("generated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_forecast_snapshots_org_horizon_idx").on(t.orgId, t.horizonDays),
    index("beamflow_forecast_snapshots_org_generated_idx").on(t.orgId, t.generatedAt),
  ]
);

export const channelEffectivenessDaily = createTable(
  "channel_effectiveness_daily",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    day: d.date("day", { mode: "string" }).notNull(),
    channel: billingChannelEnum("channel").notNull(),
    sentCount: d.integer("sent_count").notNull().default(0),
    replyCount: d.integer("reply_count").notNull().default(0),
    paidCount: d.integer("paid_count").notNull().default(0),
    collectedMinor: d.integer("collected_minor").notNull().default(0),
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
    unique("beamflow_channel_effectiveness_org_day_channel_uq").on(
      t.orgId,
      t.day,
      t.channel
    ),
    index("beamflow_channel_effectiveness_org_day_idx").on(t.orgId, t.day),
  ]
);
