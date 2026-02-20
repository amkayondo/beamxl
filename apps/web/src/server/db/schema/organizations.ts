import { sql } from "drizzle-orm";
import { index, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { autopilotModeEnum, orgMemberStatusEnum, orgRoleEnum } from "./enums";
import { user } from "./users";

export const orgs = createTable(
  "orgs",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: d.text("slug").notNull(),
    name: d.text("name").notNull(),
    defaultCurrency: d.text("default_currency").notNull().default("USD"),
    timezone: d.text("timezone").notNull().default("UTC"),
    missionBriefing: d
      .jsonb("mission_briefing")
      .notNull()
      .default(sql`'{}'::jsonb`),
    autopilotMode: autopilotModeEnum("autopilot_mode")
      .notNull()
      .default("GUARDED"),
    ownerAlertChannel: d.text("owner_alert_channel").notNull().default("EMAIL"),
    ownerDigestFrequency: d.text("owner_digest_frequency").notNull().default("DAILY"),
    stripeCustomerId: d.text("stripe_customer_id"),
    stripeSubscriptionId: d.text("stripe_subscription_id"),
    stripeSubscriptionStatus: d.text("stripe_subscription_status"),
    stripePriceId: d.text("stripe_price_id"),
    stripeCurrentPeriodEnd: d.timestamp("stripe_current_period_end", {
      withTimezone: true,
    }),
    stripeSubscriptionUpdatedAt: d.timestamp("stripe_subscription_updated_at", {
      withTimezone: true,
    }),
    createdByUserId: d
      .text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
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
  (t) => [uniqueIndex("beamflow_orgs_slug_uidx").on(t.slug)]
);

export const orgMembers = createTable(
  "org_members",
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
    role: orgRoleEnum("role").notNull().default("MEMBER"),
    status: orgMemberStatusEnum("status").notNull().default("ACTIVE"),
    invitedByUserId: d.text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    joinedAt: d.timestamp("joined_at", { withTimezone: true }),
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
    unique("beamflow_org_members_org_user_uq").on(t.orgId, t.userId),
    index("beamflow_org_members_org_idx").on(t.orgId),
    index("beamflow_org_members_user_idx").on(t.userId),
  ]
);
