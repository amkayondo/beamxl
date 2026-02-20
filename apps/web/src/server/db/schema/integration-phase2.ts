import { sql } from "drizzle-orm";
import { index, unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { orgs } from "./organizations";

export const integrationConnections = createTable(
  "integration_connections",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    provider: d.text("provider").notNull(),
    providerType: d.text("provider_type").notNull(),
    status: d.text("status").notNull().default("disconnected"),
    externalAccountId: d.text("external_account_id"),
    authConfig: d.jsonb("auth_config").notNull().default(sql`'{}'::jsonb`),
    settings: d.jsonb("settings").notNull().default(sql`'{}'::jsonb`),
    connectedAt: d.timestamp("connected_at", { withTimezone: true }),
    disconnectedAt: d.timestamp("disconnected_at", { withTimezone: true }),
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
    unique("beamflow_integration_connections_org_provider_uq").on(t.orgId, t.provider),
    index("beamflow_integration_connections_org_type_idx").on(t.orgId, t.providerType),
  ]
);

export const integrationSyncJobs = createTable(
  "integration_sync_jobs",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    integrationConnectionId: d
      .text("integration_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    direction: d.text("direction").notNull().default("PULL"),
    entityType: d.text("entity_type").notNull(),
    status: d.text("status").notNull().default("QUEUED"),
    attempt: d.integer("attempt").notNull().default(0),
    payload: d.jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    error: d.text("error"),
    startedAt: d.timestamp("started_at", { withTimezone: true }),
    completedAt: d.timestamp("completed_at", { withTimezone: true }),
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
    index("beamflow_integration_sync_jobs_org_status_idx").on(t.orgId, t.status),
    index("beamflow_integration_sync_jobs_connection_created_idx").on(
      t.integrationConnectionId,
      t.createdAt
    ),
  ]
);
