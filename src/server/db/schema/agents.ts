import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { channelEnum, commandStatusEnum, goalStatusEnum, goalTypeEnum, taskStatusEnum } from "./enums";
import { contacts } from "./contacts";
import { flowRuns } from "./flows";
import { invoices } from "./invoices";
import { orgs } from "./organizations";
import { user } from "./users";

export const agentGoals = createTable(
  "agent_goals",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    goalType: goalTypeEnum("goal_type").notNull(),
    name: d.text("name").notNull(),
    targetAmountMinor: d.integer("target_amount_minor"),
    targetPercent: d.integer("target_percent"),
    targetDays: d.integer("target_days"),
    targetDate: d.date("target_date", { mode: "string" }),
    status: goalStatusEnum("status").notNull().default("ACTIVE"),
    createdByUserId: d.text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
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
  (t) => [
    index("beamflow_agent_goals_org_status_idx").on(t.orgId, t.status),
    index("beamflow_agent_goals_org_type_idx").on(t.orgId, t.goalType),
  ]
);

export const agentGoalProgress = createTable(
  "agent_goal_progress",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    goalId: d
      .text("goal_id")
      .notNull()
      .references(() => agentGoals.id, { onDelete: "cascade" }),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    measuredAt: d
      .timestamp("measured_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    valueAmountMinor: d.integer("value_amount_minor"),
    valuePercent: d.integer("value_percent"),
    valueDays: d.integer("value_days"),
    isOnTrack: d.boolean("is_on_track").notNull().default(true),
    note: d.text("note"),
  }),
  (t) => [
    index("beamflow_agent_goal_progress_goal_idx").on(t.goalId, t.measuredAt),
    index("beamflow_agent_goal_progress_org_measured_idx").on(t.orgId, t.measuredAt),
  ]
);

export const agentTasks = createTable(
  "agent_tasks",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    createdByUserId: d.text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    sourceChannel: channelEnum("source_channel").notNull().default("WHATSAPP"),
    prompt: d.text("prompt").notNull(),
    normalizedIntent: d.text("normalized_intent"),
    executionPlan: d.jsonb("execution_plan").notNull().default(sql`'{}'::jsonb`),
    status: taskStatusEnum("status").notNull().default("DRAFT"),
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
  (t) => [index("beamflow_agent_tasks_org_status_idx").on(t.orgId, t.status)]
);

export const ownerCommands = createTable(
  "owner_commands",
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
    channel: channelEnum("channel").notNull().default("WHATSAPP"),
    commandText: d.text("command_text").notNull(),
    parsedIntent: d.text("parsed_intent"),
    status: commandStatusEnum("status").notNull().default("RECEIVED"),
    responseText: d.text("response_text"),
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
  (t) => [index("beamflow_owner_commands_org_created_idx").on(t.orgId, t.createdAt)]
);

export const agentDecisions = createTable(
  "agent_decisions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    flowRunId: d.text("flow_run_id").references(() => flowRuns.id, {
      onDelete: "set null",
    }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    contactId: d.text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    decisionType: d.text("decision_type").notNull(),
    reason: d.text("reason").notNull(),
    policyChecks: d.jsonb("policy_checks").notNull().default(sql`'{}'::jsonb`),
    modelProvider: d.text("model_provider"),
    modelName: d.text("model_name"),
    traceId: d.text("trace_id"),
    overriddenByUserId: d.text("overridden_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    overriddenAt: d.timestamp("overridden_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_agent_decisions_org_created_idx").on(t.orgId, t.createdAt),
    index("beamflow_agent_decisions_org_type_idx").on(t.orgId, t.decisionType),
  ]
);

export const approvalRequests = createTable(
  "approval_requests",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    agentTaskId: d.text("agent_task_id").references(() => agentTasks.id, {
      onDelete: "set null",
    }),
    flowRunId: d.text("flow_run_id").references(() => flowRuns.id, {
      onDelete: "set null",
    }),
    channel: channelEnum("channel").notNull().default("WHATSAPP"),
    requestText: d.text("request_text").notNull(),
    status: commandStatusEnum("status").notNull().default("RECEIVED"),
    decisionText: d.text("decision_text"),
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
    index("beamflow_approval_requests_org_status_idx").on(t.orgId, t.status),
    index("beamflow_approval_requests_org_expires_idx").on(t.orgId, t.expiresAt),
  ]
);
