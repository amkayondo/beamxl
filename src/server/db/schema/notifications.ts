import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { notificationTypeEnum } from "./enums";
import { orgs } from "./organizations";
import { user } from "./users";

export const notifications = createTable(
  "notifications",
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
    type: notificationTypeEnum("type").notNull(),
    title: d.text("title").notNull(),
    body: d.text("body").notNull(),
    link: d.text("link"),
    metadata: d.jsonb("metadata"),
    readAt: d.timestamp("read_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    index("beamflow_notifications_user_read_idx").on(t.userId, t.readAt),
    index("beamflow_notifications_org_created_idx").on(t.orgId, t.createdAt),
  ]
);
