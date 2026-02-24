import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import {
  invoiceBundleStatusEnum,
  invoiceStatusEnum,
  recurringFrequencyEnum,
  recurringScheduleStatusEnum,
} from "./enums";
import { contacts } from "./contacts";
import { orgs } from "./organizations";
import { paymentPlans } from "./plans";

export const invoiceRecurringSchedules = createTable(
  "invoice_recurring_schedules",
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
    paymentPlanId: d
      .text("payment_plan_id")
      .references(() => paymentPlans.id, { onDelete: "set null" }),
    scheduleName: d.text("schedule_name").notNull(),
    invoicePrefix: d.text("invoice_prefix").notNull().default("INV"),
    amountMinor: d.integer("amount_minor").notNull(),
    currency: d.text("currency").notNull().default("USD"),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    intervalCount: d.integer("interval_count").notNull().default(1),
    dayOfWeek: d.integer("day_of_week"),
    dayOfMonth: d.integer("day_of_month"),
    timezone: d.text("timezone").notNull().default("UTC"),
    nextRunAt: d.timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: d.timestamp("last_run_at", { withTimezone: true }),
    autoTriggerWorkflow: d.boolean("auto_trigger_workflow").notNull().default(true),
    status: recurringScheduleStatusEnum("status").notNull().default("ACTIVE"),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: d.timestamp("deleted_at", { withTimezone: true }),
  }),
  (t) => [
    index("beamflow_invoice_recurring_org_status_next_run_idx").on(
      t.orgId,
      t.status,
      t.nextRunAt
    ),
    index("beamflow_invoice_recurring_org_contact_idx").on(t.orgId, t.contactId),
  ]
);

export const invoiceBundles = createTable(
  "invoice_bundles",
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
    bundleNumber: d.text("bundle_number").notNull(),
    title: d.text("title"),
    status: invoiceBundleStatusEnum("status").notNull().default("OPEN"),
    currency: d.text("currency").notNull().default("USD"),
    dueDate: d.timestamp("due_date", { withTimezone: true }),
    amountDueMinor: d.integer("amount_due_minor").notNull().default(0),
    amountPaidMinor: d.integer("amount_paid_minor").notNull().default(0),
    publicPayToken: d
      .text("public_pay_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    payLinkUrl: d.text("pay_link_url"),
    paymentLinkExpiresAt: d.timestamp("payment_link_expires_at", { withTimezone: true }),
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
    uniqueIndex("beamflow_invoice_bundles_org_bundle_number_uidx").on(
      t.orgId,
      t.bundleNumber
    ),
    uniqueIndex("beamflow_invoice_bundles_public_pay_token_uidx").on(t.publicPayToken),
    index("beamflow_invoice_bundles_org_status_due_date_idx").on(
      t.orgId,
      t.status,
      t.dueDate
    ),
  ]
);

export const invoices = createTable(
  "invoices",
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
    paymentPlanId: d
      .text("payment_plan_id")
      .references(() => paymentPlans.id, { onDelete: "set null" }),
    recurringScheduleId: d
      .text("recurring_schedule_id")
      .references(() => invoiceRecurringSchedules.id, { onDelete: "set null" }),
    bundleId: d
      .text("bundle_id")
      .references(() => invoiceBundles.id, { onDelete: "set null" }),
    invoiceNumber: d.text("invoice_number").notNull(),
    periodStart: d.date("period_start", { mode: "string" }).notNull(),
    periodEnd: d.date("period_end", { mode: "string" }).notNull(),
    dueDate: d.timestamp("due_date", { withTimezone: true }).notNull(),
    amountDueMinor: d.integer("amount_due_minor").notNull(),
    amountPaidMinor: d.integer("amount_paid_minor").notNull().default(0),
    discountAppliedMinor: d.integer("discount_applied_minor").notNull().default(0),
    notes: d.text("notes"),
    tags: d.text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    lineItems: d.jsonb("line_items").notNull().default(sql`'[]'::jsonb`),
    currency: d.text("currency").notNull().default("USD"),
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    publicPayToken: d
      .text("public_pay_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    payLinkUrl: d.text("pay_link_url"),
    paymentLinkExpiresAt: d.timestamp("payment_link_expires_at", { withTimezone: true }),
    earlyDiscountPercent: d.integer("early_discount_percent").notNull().default(0),
    earlyDiscountExpiresAt: d.timestamp("early_discount_expires_at", { withTimezone: true }),
    allowPartialPayments: d.boolean("allow_partial_payments").notNull().default(false),
    minimumPartialAmountMinor: d
      .integer("minimum_partial_amount_minor")
      .notNull()
      .default(0),
    stripeCheckoutSessionId: d.text("stripe_checkout_session_id"),
    stripePaymentIntentId: d.text("stripe_payment_intent_id"),
    writeOffReason: d.text("write_off_reason"),
    writtenOffAt: d.timestamp("written_off_at", { withTimezone: true }),
    lastReminderAt: d.timestamp("last_reminder_at", { withTimezone: true }),
    paidAt: d.timestamp("paid_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: d.timestamp("deleted_at", { withTimezone: true }),
  }),
  (t) => [
    uniqueIndex("beamflow_invoices_public_pay_token_uidx").on(t.publicPayToken),
    index("beamflow_invoices_org_status_due_date_idx").on(
      t.orgId,
      t.status,
      t.dueDate
    ),
    index("beamflow_invoices_contact_due_date_idx").on(t.contactId, t.dueDate),
    index("beamflow_invoices_org_bundle_idx").on(t.orgId, t.bundleId),
    index("beamflow_invoices_org_recurring_schedule_idx").on(
      t.orgId,
      t.recurringScheduleId
    ),
  ]
);

export const invoiceBundleItems = createTable(
  "invoice_bundle_items",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    bundleId: d
      .text("bundle_id")
      .notNull()
      .references(() => invoiceBundles.id, { onDelete: "cascade" }),
    invoiceId: d
      .text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    uniqueIndex("beamflow_invoice_bundle_items_bundle_invoice_uidx").on(
      t.bundleId,
      t.invoiceId
    ),
    uniqueIndex("beamflow_invoice_bundle_items_invoice_uidx").on(t.invoiceId),
    index("beamflow_invoice_bundle_items_org_bundle_idx").on(t.orgId, t.bundleId),
  ]
);
