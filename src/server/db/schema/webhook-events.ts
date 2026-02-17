import { sql } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";

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
    providerEventId: d.text("provider_event_id").notNull(),
    orgId: d.text("org_id").references(() => orgs.id, { onDelete: "set null" }),
    signatureVerified: d.boolean("signature_verified").notNull().default(false),
    status: webhookStatusEnum("status").notNull().default("RECEIVED"),
    payload: d.jsonb("payload").notNull(),
    error: d.text("error"),
    receivedAt: d
      .timestamp("received_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    processedAt: d.timestamp("processed_at", { withTimezone: true }),
  }),
  (t) => [
    unique("beamflow_webhook_events_provider_event_uq").on(
      t.provider,
      t.providerEventId
    ),
  ]
);
