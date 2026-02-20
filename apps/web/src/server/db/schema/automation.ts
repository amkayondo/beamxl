import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { automationChannelEnum, automationTriggerEnum } from "./enums";
import { orgs } from "./organizations";
import { messageTemplates } from "./templates";

export const automationRules = createTable(
  "automation_rules",
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
    triggerType: automationTriggerEnum("trigger_type").notNull(),
    offsetDays: d.integer("offset_days").notNull().default(0),
    channel: automationChannelEnum("channel").notNull().default("WHATSAPP"),
    templateId: d.text("template_id").references(() => messageTemplates.id, {
      onDelete: "set null",
    }),
    isActive: d.boolean("is_active").notNull().default(true),
    priority: d.integer("priority").notNull().default(0),
    quietHoursStart: d.integer("quiet_hours_start"),
    quietHoursEnd: d.integer("quiet_hours_end"),
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
    index("beamflow_automation_rules_org_idx").on(t.orgId),
    index("beamflow_automation_rules_org_active_idx").on(t.orgId, t.isActive),
  ]
);
