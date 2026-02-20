import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { abTestStatusEnum, approvalDecisionEnum, workflowStepStatusEnum } from "./enums";
import { flowRuns, flows } from "./flows";
import { orgs } from "./organizations";
import { user } from "./users";

export const workflowVersions = createTable(
  "workflow_versions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    flowId: d
      .text("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    versionNumber: d.integer("version_number").notNull(),
    nodesJson: d.jsonb("nodes_json").notNull().default(sql`'[]'::jsonb`),
    edgesJson: d.jsonb("edges_json").notNull().default(sql`'[]'::jsonb`),
    isPublished: d.boolean("is_published").notNull().default(false),
    createdByUserId: d.text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_workflow_versions_flow_version_idx").on(t.flowId, t.versionNumber),
    index("beamflow_workflow_versions_org_created_idx").on(t.orgId, t.createdAt),
  ]
);

export const workflowNodes = createTable(
  "workflow_nodes",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    versionId: d
      .text("version_id")
      .notNull()
      .references(() => workflowVersions.id, { onDelete: "cascade" }),
    nodeKey: d.text("node_key").notNull(),
    nodeType: d.text("node_type").notNull(),
    positionX: d.integer("position_x").notNull().default(0),
    positionY: d.integer("position_y").notNull().default(0),
    config: d.jsonb("config").notNull().default(sql`'{}'::jsonb`),
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
    index("beamflow_workflow_nodes_version_idx").on(t.versionId),
    index("beamflow_workflow_nodes_org_type_idx").on(t.orgId, t.nodeType),
  ]
);

export const workflowEdges = createTable(
  "workflow_edges",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    versionId: d
      .text("version_id")
      .notNull()
      .references(() => workflowVersions.id, { onDelete: "cascade" }),
    edgeKey: d.text("edge_key").notNull(),
    sourceNodeKey: d.text("source_node_key").notNull(),
    sourceHandle: d.text("source_handle"),
    targetNodeKey: d.text("target_node_key").notNull(),
    targetHandle: d.text("target_handle"),
    conditionRef: d.jsonb("condition_ref").notNull().default(sql`'{}'::jsonb`),
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
    index("beamflow_workflow_edges_version_idx").on(t.versionId),
    index("beamflow_workflow_edges_org_source_idx").on(t.orgId, t.sourceNodeKey),
  ]
);

export const workflowRunSteps = createTable(
  "workflow_run_steps",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    flowRunId: d
      .text("flow_run_id")
      .notNull()
      .references(() => flowRuns.id, { onDelete: "cascade" }),
    nodeKey: d.text("node_key").notNull(),
    stepIndex: d.integer("step_index").notNull(),
    status: workflowStepStatusEnum("status").notNull().default("PENDING"),
    attempt: d.integer("attempt").notNull().default(1),
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
    index("beamflow_workflow_run_steps_run_step_idx").on(t.flowRunId, t.stepIndex),
    index("beamflow_workflow_run_steps_org_status_idx").on(t.orgId, t.status),
  ]
);

export const workflowApprovals = createTable(
  "workflow_approvals",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    flowRunStepId: d
      .text("flow_run_step_id")
      .notNull()
      .references(() => workflowRunSteps.id, { onDelete: "cascade" }),
    requestedChannel: d.text("requested_channel").notNull().default("IN_APP"),
    requestBody: d.text("request_body").notNull(),
    decision: approvalDecisionEnum("decision").notNull().default("PENDING"),
    decisionBody: d.text("decision_body"),
    expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
    decidedAt: d.timestamp("decided_at", { withTimezone: true }),
    decidedByUserId: d.text("decided_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
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
    index("beamflow_workflow_approvals_step_idx").on(t.flowRunStepId),
    index("beamflow_workflow_approvals_org_decision_idx").on(t.orgId, t.decision),
  ]
);

export const workflowAbTests = createTable(
  "workflow_ab_tests",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    flowId: d
      .text("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    name: d.text("name").notNull(),
    variantA: d.jsonb("variant_a").notNull().default(sql`'{}'::jsonb`),
    variantB: d.jsonb("variant_b").notNull().default(sql`'{}'::jsonb`),
    winner: d.text("winner"),
    status: abTestStatusEnum("status").notNull().default("DRAFT"),
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
    index("beamflow_workflow_ab_tests_org_status_idx").on(t.orgId, t.status),
    index("beamflow_workflow_ab_tests_flow_idx").on(t.flowId),
  ]
);
