import { sql } from "drizzle-orm";
import { index, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { webhookStatusEnum } from "./enums";
import { orgs } from "./organizations";

export const webhookEvents = createTable(
  "webhook_events",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: d.text("provider").notNull(),
    eventId: d.text("event_id").notNull(),
    eventType: d.text("event_type").notNull(),
    providerEventId: d.text("provider_event_id").notNull(),
    accountId: d.text("account_id"),
    orgId: d.text("org_id").references(() => orgs.id, { onDelete: "set null" }),
    signatureVerified: d.boolean("signature_verified").notNull().default(false),
    status: webhookStatusEnum("status").notNull().default("RECEIVED"),
    payload: d.jsonb("payload").notNull(),
    error: d.text("error"),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    receivedAt: d
      .timestamp("received_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    processedAt: d.timestamp("processed_at", { withTimezone: true }),
  }),
  (t) => [
    uniqueIndex("beamflow_webhook_events_event_id_uidx").on(t.eventId),
    unique("beamflow_webhook_events_provider_event_uq").on(
      t.provider,
      t.providerEventId
    ),
    index("beamflow_webhook_events_event_id_idx").on(t.eventId),
  ]
);
