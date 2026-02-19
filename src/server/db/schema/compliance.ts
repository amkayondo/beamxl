import { sql } from "drizzle-orm";
import { index, unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { consentChannelEnum, consentMethodEnum } from "./enums";
import { contacts } from "./contacts";
import { orgs } from "./organizations";

export const contactConsents = createTable(
  "contact_consents",
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
    channel: consentChannelEnum("channel").notNull(),
    method: consentMethodEnum("method").notNull(),
    obtainedAt: d
      .timestamp("obtained_at", { withTimezone: true })
      .notNull(),
    revokedAt: d.timestamp("revoked_at", { withTimezone: true }),
    revokeMethod: d.text("revoke_method"),
    evidenceUrl: d.text("evidence_url"),
    ipAddress: d.text("ip_address"),
    notes: d.text("notes"),
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
    index("beamflow_contact_consents_org_contact_idx").on(t.orgId, t.contactId),
    index("beamflow_contact_consents_org_contact_channel_idx").on(
      t.orgId,
      t.contactId,
      t.channel
    ),
  ]
);

export const complianceSettings = createTable(
  "compliance_settings",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    defaultFrequencyCap: d
      .integer("default_frequency_cap")
      .notNull()
      .default(7),
    frequencyWindowDays: d
      .integer("frequency_window_days")
      .notNull()
      .default(7),
    quietHoursStart: d.integer("quiet_hours_start").notNull().default(21),
    quietHoursEnd: d.integer("quiet_hours_end").notNull().default(8),
    defaultTimezone: d
      .text("default_timezone")
      .notNull()
      .default("America/New_York"),
    enforceTcpa: d.boolean("enforce_tcpa").notNull().default(true),
    enforceFdcpa: d.boolean("enforce_fdcpa").notNull().default(true),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [unique("beamflow_compliance_settings_org_uq").on(t.orgId)]
);

export const stateComplianceRules = createTable(
  "state_compliance_rules",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    stateCode: d.text("state_code").notNull(),
    frequencyCap: d.integer("frequency_cap").notNull(),
    frequencyWindowDays: d
      .integer("frequency_window_days")
      .notNull()
      .default(7),
    quietHoursStart: d.integer("quiet_hours_start"),
    quietHoursEnd: d.integer("quiet_hours_end"),
    notes: d.text("notes"),
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
    unique("beamflow_state_rules_org_state_uq").on(t.orgId, t.stateCode),
    index("beamflow_state_rules_org_idx").on(t.orgId),
  ]
);
