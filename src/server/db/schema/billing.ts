import { sql } from "drizzle-orm";
import { index, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import {
  billingChannelEnum,
  overageModeEnum,
  subscriptionLifecycleEnum,
  topupStatusEnum,
  trialLifecycleEnum,
} from "./enums";
import { orgs } from "./organizations";

export const planCatalog = createTable(
  "plan_catalog",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: d.text("code").notNull(),
    name: d.text("name").notNull(),
    monthlyPriceMinor: d.integer("monthly_price_minor").notNull(),
    invoicesLimit: d.integer("invoices_limit"),
    smsCredits: d.integer("sms_credits").notNull().default(0),
    emailCredits: d.integer("email_credits").notNull().default(0),
    voiceSeconds: d.integer("voice_seconds").notNull().default(0),
    usersLimit: d.integer("users_limit"),
    workflowsLimit: d.integer("workflows_limit"),
    isActive: d.boolean("is_active").notNull().default(true),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [unique("beamflow_plan_catalog_code_uq").on(t.code)]
);

export const orgPlanSubscriptions = createTable(
  "org_plan_subscriptions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    planId: d
      .text("plan_id")
      .notNull()
      .references(() => planCatalog.id, { onDelete: "restrict" }),
    status: subscriptionLifecycleEnum("status").notNull().default("TRIALING"),
    stripeCustomerId: d.text("stripe_customer_id"),
    stripeSubscriptionId: d.text("stripe_subscription_id"),
    trialStartsAt: d.timestamp("trial_starts_at", { withTimezone: true }),
    trialEndsAt: d.timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: d.timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: d.timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: d.boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: d.timestamp("canceled_at", { withTimezone: true }),
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
    index("beamflow_org_plan_subscriptions_org_idx").on(t.orgId),
    uniqueIndex("beamflow_org_plan_subscriptions_org_active_uidx").on(
      t.orgId,
      t.status,
      t.updatedAt
    ),
  ]
);

export const usageCredits = createTable(
  "usage_credits",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    cycleStart: d.timestamp("cycle_start", { withTimezone: true }).notNull(),
    cycleEnd: d.timestamp("cycle_end", { withTimezone: true }).notNull(),
    smsUsed: d.integer("sms_used").notNull().default(0),
    smsIncluded: d.integer("sms_included").notNull().default(0),
    emailUsed: d.integer("email_used").notNull().default(0),
    emailIncluded: d.integer("email_included").notNull().default(0),
    voiceSecondsUsed: d.integer("voice_seconds_used").notNull().default(0),
    voiceSecondsIncluded: d.integer("voice_seconds_included").notNull().default(0),
    whatsappUsed: d.integer("whatsapp_used").notNull().default(0),
    whatsappIncluded: d.integer("whatsapp_included").notNull().default(0),
    overageMode: overageModeEnum("overage_mode").notNull().default("HARD_STOP"),
    overageCapMinor: d.integer("overage_cap_minor").notNull().default(0),
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
    unique("beamflow_usage_credits_org_cycle_uq").on(t.orgId, t.cycleStart, t.cycleEnd),
    index("beamflow_usage_credits_org_cycle_idx").on(t.orgId, t.cycleStart),
  ]
);

export const creditTopups = createTable(
  "credit_topups",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    packCode: d.text("pack_code").notNull(),
    smsCredits: d.integer("sms_credits").notNull().default(0),
    emailCredits: d.integer("email_credits").notNull().default(0),
    voiceSeconds: d.integer("voice_seconds").notNull().default(0),
    whatsappCredits: d.integer("whatsapp_credits").notNull().default(0),
    priceMinor: d.integer("price_minor").notNull(),
    currency: d.text("currency").notNull().default("USD"),
    stripePaymentIntentId: d.text("stripe_payment_intent_id"),
    status: topupStatusEnum("status").notNull().default("PENDING"),
    purchasedAt: d.timestamp("purchased_at", { withTimezone: true }),
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
    index("beamflow_credit_topups_org_created_idx").on(t.orgId, t.createdAt),
    uniqueIndex("beamflow_credit_topups_stripe_intent_uidx").on(t.stripePaymentIntentId),
  ]
);

export const overageEvents = createTable(
  "overage_events",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    channel: billingChannelEnum("channel").notNull(),
    units: d.integer("units").notNull().default(0),
    amountMinor: d.integer("amount_minor").notNull().default(0),
    thresholdMinor: d.integer("threshold_minor"),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    occurredAt: d
      .timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [index("beamflow_overage_events_org_occurred_idx").on(t.orgId, t.occurredAt)]
);

export const overageCaps = createTable(
  "overage_caps",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    mode: overageModeEnum("mode").notNull().default("HARD_STOP"),
    capMinor: d.integer("cap_minor").notNull().default(0),
    threshold10Enabled: d.boolean("threshold_10_enabled").notNull().default(true),
    threshold25Enabled: d.boolean("threshold_25_enabled").notNull().default(true),
    threshold50Enabled: d.boolean("threshold_50_enabled").notNull().default(true),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [unique("beamflow_overage_caps_org_uq").on(t.orgId)]
);

export const trialState = createTable(
  "trial_state",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    status: trialLifecycleEnum("status").notNull().default("PENDING"),
    startsAt: d.timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: d.timestamp("ends_at", { withTimezone: true }).notNull(),
    requiresCardAt: d.timestamp("requires_card_at", { withTimezone: true }),
    convertedAt: d.timestamp("converted_at", { withTimezone: true }),
    convertedPlanCode: d.text("converted_plan_code"),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [unique("beamflow_trial_state_org_uq").on(t.orgId)]
);
