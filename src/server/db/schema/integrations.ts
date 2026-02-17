import { sql } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import { providerKindEnum } from "./enums";
import { orgs } from "./organizations";

export const integrationSettings = createTable(
  "integration_settings",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    providerKind: providerKindEnum("provider_kind").notNull(),
    provider: d.text("provider").notNull(),
    displayName: d.text("display_name").notNull(),
    isEnabled: d.boolean("is_enabled").notNull().default(false),
    secretCiphertext: d.text("secret_ciphertext"),
    secretKeyRef: d.text("secret_key_ref"),
    config: d.jsonb("config").notNull().default(sql`'{}'::jsonb`),
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
    unique("beamflow_integration_settings_org_kind_provider_uq").on(
      t.orgId,
      t.providerKind,
      t.provider
    ),
  ]
);
