import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import {
  channelEnum,
  interactiveStatusEnum,
  interactiveTypeEnum,
  surveyQuestionTypeEnum,
} from "./enums";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { invoices } from "./invoices";
import { orgs } from "./organizations";
import { user } from "./users";

export const interactiveMessages = createTable(
  "interactive_messages",
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
    conversationId: d.text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    workflowNodeId: d.text("workflow_node_id"),
    channel: channelEnum("channel").notNull().default("WHATSAPP"),
    type: interactiveTypeEnum("type").notNull(),
    prompt: d.text("prompt").notNull(),
    status: interactiveStatusEnum("status").notNull().default("PENDING"),
    expectedBy: d.timestamp("expected_by", { withTimezone: true }),
    respondedAt: d.timestamp("responded_at", { withTimezone: true }),
    routedBranch: d.text("routed_branch"),
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
    index("beamflow_interactive_messages_org_contact_idx").on(t.orgId, t.contactId),
    index("beamflow_interactive_messages_org_status_idx").on(t.orgId, t.status),
  ]
);

export const interactiveOptions = createTable(
  "interactive_options",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    interactiveMessageId: d
      .text("interactive_message_id")
      .notNull()
      .references(() => interactiveMessages.id, { onDelete: "cascade" }),
    optionKey: d.text("option_key").notNull(),
    label: d.text("label").notNull(),
    sortOrder: d.integer("sort_order").notNull().default(0),
    branchKey: d.text("branch_key"),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [index("beamflow_interactive_options_message_idx").on(t.interactiveMessageId)]
);

export const interactiveResponses = createTable(
  "interactive_responses",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    interactiveMessageId: d
      .text("interactive_message_id")
      .notNull()
      .references(() => interactiveMessages.id, { onDelete: "cascade" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    rawText: d.text("raw_text"),
    normalizedValue: d.text("normalized_value"),
    detectedIntent: d.text("detected_intent"),
    sentimentScore: d.doublePrecision("sentiment_score"),
    routedBranch: d.text("routed_branch"),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    receivedAt: d
      .timestamp("received_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_interactive_responses_message_idx").on(t.interactiveMessageId),
    index("beamflow_interactive_responses_org_contact_idx").on(t.orgId, t.contactId),
  ]
);

export const surveys = createTable(
  "surveys",
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
    triggerType: d.text("trigger_type").notNull(),
    channel: channelEnum("channel").notNull().default("EMAIL"),
    isActive: d.boolean("is_active").notNull().default(true),
    createdByUserId: d.text("created_by_user_id").references(() => user.id, {
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
  (t) => [index("beamflow_surveys_org_active_idx").on(t.orgId, t.isActive)]
);

export const surveyQuestions = createTable(
  "survey_questions",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    surveyId: d
      .text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    questionType: surveyQuestionTypeEnum("question_type").notNull(),
    prompt: d.text("prompt").notNull(),
    isRequired: d.boolean("is_required").notNull().default(false),
    position: d.integer("position").notNull().default(0),
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
  (t) => [index("beamflow_survey_questions_survey_idx").on(t.surveyId, t.position)]
);

export const surveyResponses = createTable(
  "survey_responses",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    surveyId: d
      .text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    questionId: d
      .text("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    invoiceId: d.text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    answerText: d.text("answer_text"),
    answerNumeric: d.integer("answer_numeric"),
    metadata: d.jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    submittedAt: d
      .timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_survey_responses_org_contact_idx").on(t.orgId, t.contactId),
    index("beamflow_survey_responses_survey_idx").on(t.surveyId),
  ]
);
