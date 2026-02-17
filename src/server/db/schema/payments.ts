import { sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { paymentStatusEnum } from "./enums";
import { invoices } from "./invoices";
import { orgs } from "./organizations";

export const payments = createTable(
  "payments",
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
    provider: d.text("provider").notNull(),
    providerPaymentId: d.text("provider_payment_id"),
    providerIntentId: d.text("provider_intent_id"),
    amountMinor: d.integer("amount_minor").notNull(),
    currency: d.text("currency").notNull().default("USD"),
    status: paymentStatusEnum("status").notNull().default("INITIATED"),
    paidAt: d.timestamp("paid_at", { withTimezone: true }),
    rawPayload: d.jsonb("raw_payload"),
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
    uniqueIndex("beamflow_payments_provider_payment_id_uidx").on(
      t.providerPaymentId
    ),
  ]
);
