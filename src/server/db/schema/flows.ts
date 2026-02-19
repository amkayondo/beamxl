import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { flowRunStatusEnum, flowStatusEnum } from "./enums";
import { orgs } from "./organizations";
import { user } from "./users";

export const flows = createTable(
  "flows",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: d.text("name").notNull(),
    status: flowStatusEnum("status").notNull().default("DRAFT"),
    nodesJson: d
      .jsonb("nodes_json")
      .notNull()
      .default(sql`'[]'::jsonb`),
    edgesJson: d
      .jsonb("edges_json")
      .notNull()
      .default(sql`'[]'::jsonb`),
    viewportJson: d
      .jsonb("viewport_json")
      .notNull()
      .default(sql`'{"x":0,"y":0,"zoom":0.9}'::jsonb`),
    updatedByUserId: d
      .text("updated_by_user_id")
      .references(() => user.id, { onDelete: "set null" }),
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
    index("beamflow_flows_org_status_idx").on(t.orgId, t.status),
    index("beamflow_flows_org_updated_idx").on(t.orgId, t.updatedAt),
  ]
);

export const flowRuns = createTable(
  "flow_runs",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    flowId: d
      .text("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    triggeredBy: d.text("triggered_by").notNull(),
    triggerEvent: d.text("trigger_event"),
    status: flowRunStatusEnum("run_status").notNull().default("RUNNING"),
    startedAt: d
      .timestamp("started_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: d.timestamp("completed_at", { withTimezone: true }),
    log: d
      .jsonb("log")
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_flow_runs_flow_idx").on(t.flowId),
    index("beamflow_flow_runs_org_status_idx").on(t.orgId, t.status),
  ]
);
