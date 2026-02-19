import { sql } from "drizzle-orm";
import { index, primaryKey, unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { languageCodeEnum } from "./enums";
import { orgs } from "./organizations";

export const contacts = createTable(
  "contacts",
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
    phoneE164: d.text("phone_e164").notNull(),
    email: d.text("email"),
    language: languageCodeEnum("language").notNull().default("EN"),
    timezone: d.text("timezone").default("America/New_York"),
    stateCode: d.text("state_code"),
    optedOutAt: d.timestamp("opted_out_at", { withTimezone: true }),
    optOutReason: d.text("opt_out_reason"),
    lastInboundAt: d.timestamp("last_inbound_at", { withTimezone: true }),
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
    index("beamflow_contacts_org_name_idx").on(t.orgId, t.name),
    index("beamflow_contacts_org_opted_out_idx").on(t.orgId, t.optedOutAt),
    index("beamflow_contacts_org_phone_idx").on(t.orgId, t.phoneE164),
  ]
);

export const tags = createTable(
  "tags",
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
    color: d.text("color").notNull().default("slate"),
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
  (t) => [unique("beamflow_tags_org_name_uq").on(t.orgId, t.name)]
);

export const contactTags = createTable(
  "contact_tags",
  (d) => ({
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: d
      .text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  }),
  (t) => [
    primaryKey({ columns: [t.contactId, t.tagId] }),
    index("beamflow_contact_tags_org_idx").on(t.orgId),
  ]
);
