import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import {
  extensionBrowserEnum,
  extensionCaptureSourceEnum,
  extensionCaptureStatusEnum,
  extensionInstallationStatusEnum,
  mobileApprovalActionEnum,
  mobilePlatformEnum,
} from "./enums";
import { invoices } from "./invoices";
import { orgs } from "./organizations";
import { approvalRequests } from "./agents";
import { user } from "./users";

export const mobileDeviceTokens = createTable(
  "mobile_device_tokens",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: d.text("device_id").notNull(),
    expoPushToken: d.text("expo_push_token").notNull(),
    platform: mobilePlatformEnum("platform").notNull(),
    appVersion: d.text("app_version"),
    isActive: d.boolean("is_active").notNull().default(true),
    lastSeenAt: d
      .timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
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
    uniqueIndex("beamflow_mobile_device_tokens_org_user_device_uidx").on(
      t.orgId,
      t.userId,
      t.deviceId
    ),
    uniqueIndex("beamflow_mobile_device_tokens_expo_token_uidx").on(t.expoPushToken),
    index("beamflow_mobile_device_tokens_org_user_active_idx").on(
      t.orgId,
      t.userId,
      t.isActive
    ),
  ]
);

export const extensionInstallations = createTable(
  "extension_installations",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: d.text("user_id").references(() => user.id, { onDelete: "set null" }),
    installationId: d.text("installation_id").notNull(),
    browser: extensionBrowserEnum("browser").notNull().default("CHROME"),
    extensionVersion: d.text("extension_version").notNull(),
    status: extensionInstallationStatusEnum("status").notNull().default("ACTIVE"),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    lastSeenAt: d
      .timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
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
    uniqueIndex("beamflow_extension_installations_org_installation_uidx").on(
      t.orgId,
      t.installationId
    ),
    index("beamflow_extension_installations_org_status_seen_idx").on(
      t.orgId,
      t.status,
      t.lastSeenAt
    ),
  ]
);

export const extensionCaptureEvents = createTable(
  "extension_capture_events",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: d.text("user_id").references(() => user.id, { onDelete: "set null" }),
    installationId: d.text("installation_id").references(() => extensionInstallations.id, {
      onDelete: "set null",
    }),
    sourceType: extensionCaptureSourceEnum("source_type").notNull(),
    sourceUrl: d.text("source_url"),
    rawPayload: d.jsonb("raw_payload").notNull().default(sql`'{}'::jsonb`),
    normalizedDraft: d.jsonb("normalized_draft").notNull().default(sql`'{}'::jsonb`),
    resolution: d.jsonb("resolution").notNull().default(sql`'{}'::jsonb`),
    status: extensionCaptureStatusEnum("status").notNull().default("DRAFT"),
    appliedInvoiceId: d.text("applied_invoice_id").references(() => invoices.id, {
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
    index("beamflow_extension_capture_events_org_status_created_idx").on(
      t.orgId,
      t.status,
      t.createdAt
    ),
    index("beamflow_extension_capture_events_org_installation_idx").on(
      t.orgId,
      t.installationId
    ),
  ]
);

export const mobileApprovalActions = createTable(
  "mobile_approval_actions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    approvalRequestId: d
      .text("approval_request_id")
      .notNull()
      .references(() => approvalRequests.id, { onDelete: "cascade" }),
    userId: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    idempotencyKey: d.text("idempotency_key").notNull(),
    action: mobileApprovalActionEnum("action").notNull(),
    note: d.text("note"),
    snoozeUntil: d.timestamp("snooze_until", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    uniqueIndex("beamflow_mobile_approval_actions_request_idempotency_uidx").on(
      t.orgId,
      t.approvalRequestId,
      t.idempotencyKey
    ),
    index("beamflow_mobile_approval_actions_org_created_idx").on(t.orgId, t.createdAt),
  ]
);
