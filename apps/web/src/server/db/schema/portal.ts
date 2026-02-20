import { sql } from "drizzle-orm";
import { index, unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { portalRequestStatusEnum } from "./enums";
import { contacts } from "./contacts";
import { invoices } from "./invoices";
import { orgs } from "./organizations";
import { user } from "./users";

export const clientPortalAccounts = createTable(
  "client_portal_accounts",
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
    accessTokenHash: d.text("access_token_hash"),
    isActive: d.boolean("is_active").notNull().default(true),
    lastLoginAt: d.timestamp("last_login_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [unique("beamflow_client_portal_accounts_org_contact_uq").on(t.orgId, t.contactId)]
);

export const clientPortalSessions = createTable(
  "client_portal_sessions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    portalAccountId: d
      .text("portal_account_id")
      .notNull()
      .references(() => clientPortalAccounts.id, { onDelete: "cascade" }),
    sessionTokenHash: d.text("session_token_hash").notNull(),
    ipHash: d.text("ip_hash"),
    userAgentHash: d.text("user_agent_hash"),
    expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: d.timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: d.timestamp("revoked_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_client_portal_sessions_account_idx").on(t.portalAccountId, t.expiresAt),
    index("beamflow_client_portal_sessions_org_created_idx").on(t.orgId, t.createdAt),
  ]
);

export const portalPreferences = createTable(
  "portal_preferences",
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
    allowSms: d.boolean("allow_sms").notNull().default(true),
    allowEmail: d.boolean("allow_email").notNull().default(true),
    allowWhatsapp: d.boolean("allow_whatsapp").notNull().default(true),
    allowVoice: d.boolean("allow_voice").notNull().default(true),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [unique("beamflow_portal_preferences_org_contact_uq").on(t.orgId, t.contactId)]
);

export const paymentPlanRequests = createTable(
  "payment_plan_requests",
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
    invoiceId: d
      .text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    requestedAmountMinor: d.integer("requested_amount_minor"),
    requestedInstallments: d.integer("requested_installments"),
    preferredDayOfMonth: d.integer("preferred_day_of_month"),
    notes: d.text("notes"),
    status: portalRequestStatusEnum("status").notNull().default("PENDING"),
    submittedAt: d
      .timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    resolvedAt: d.timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: d.text("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  }),
  (t) => [
    index("beamflow_payment_plan_requests_org_status_idx").on(t.orgId, t.status),
    index("beamflow_payment_plan_requests_org_submitted_idx").on(t.orgId, t.submittedAt),
  ]
);
