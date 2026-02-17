import { sql } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { channelEnum, conversationStatusEnum } from "./enums";
import { contacts } from "./contacts";
import { orgs } from "./organizations";
import { user } from "./users";

export const conversations = createTable(
  "conversations",
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
    channel: channelEnum("channel").notNull().default("WHATSAPP"),
    status: conversationStatusEnum("status").notNull().default("OPEN"),
    lastMessageAt: d.timestamp("last_message_at", { withTimezone: true }),
    unreadCount: d.integer("unread_count").notNull().default(0),
    assignedToUserId: d.text("assigned_to_user_id").references(() => user.id, {
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
    unique("beamflow_conversations_org_contact_channel_uq").on(
      t.orgId,
      t.contactId,
      t.channel
    ),
  ]
);
