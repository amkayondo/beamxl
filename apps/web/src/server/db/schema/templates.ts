import { sql } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { channelEnum, languageCodeEnum, templateApprovalStatusEnum } from "./enums";
import { orgs } from "./organizations";
import { user } from "./users";

export const messageTemplates = createTable(
  "message_templates",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    key: d.text("key").notNull(),
    language: languageCodeEnum("language").notNull().default("EN"),
    version: d.integer("version").notNull().default(1),
    body: d.text("body").notNull(),
    subject: d.text("subject"),
    htmlBody: d.text("html_body"),
    channel: channelEnum("channel"),
    approvalStatus: templateApprovalStatusEnum("approval_status")
      .notNull()
      .default("DRAFT"),
    complianceLocked: d.boolean("compliance_locked").notNull().default(false),
    approvedByUserId: d.text("approved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedAt: d.timestamp("approved_at", { withTimezone: true }),
    rejectionReason: d.text("rejection_reason"),
    isActive: d.boolean("is_active").notNull().default(true),
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
    unique("beamflow_message_templates_org_key_lang_version_uq").on(
      t.orgId,
      t.key,
      t.language,
      t.version
    ),
  ]
);
