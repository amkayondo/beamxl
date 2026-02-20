import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { invoiceStatusEnum } from "./enums";
import { contacts } from "./contacts";
import { orgs } from "./organizations";
import { paymentPlans } from "./plans";

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
    invoiceNumber: d.text("invoice_number").notNull(),
    periodStart: d.date("period_start", { mode: "string" }).notNull(),
    periodEnd: d.date("period_end", { mode: "string" }).notNull(),
    dueDate: d.timestamp("due_date", { withTimezone: true }).notNull(),
    amountDueMinor: d.integer("amount_due_minor").notNull(),
    amountPaidMinor: d.integer("amount_paid_minor").notNull().default(0),
    currency: d.text("currency").notNull().default("USD"),
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    publicPayToken: d
      .text("public_pay_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    payLinkUrl: d.text("pay_link_url"),
    stripeCheckoutSessionId: d.text("stripe_checkout_session_id"),
    stripePaymentIntentId: d.text("stripe_payment_intent_id"),
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
  ]
);
