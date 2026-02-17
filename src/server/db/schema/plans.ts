import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { planFrequencyEnum, planStatusEnum } from "./enums";
import { contacts } from "./contacts";
import { orgs } from "./organizations";

export const paymentPlans = createTable(
  "payment_plans",
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
    name: d.text("name").notNull(),
    amountMinor: d.integer("amount_minor").notNull(),
    currency: d.text("currency").notNull().default("USD"),
    frequency: planFrequencyEnum("frequency").notNull(),
    startDate: d.date("start_date", { mode: "string" }).notNull(),
    dueDayOfMonth: d.integer("due_day_of_month"),
    graceDays: d.integer("grace_days").notNull().default(0),
    penaltyType: d.text("penalty_type").notNull().default("NONE"),
    penaltyValueMinor: d.integer("penalty_value_minor").notNull().default(0),
    status: planStatusEnum("status").notNull().default("ACTIVE"),
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
    index("beamflow_payment_plans_org_status_idx").on(t.orgId, t.status),
    index("beamflow_payment_plans_contact_idx").on(t.contactId),
  ]
);
