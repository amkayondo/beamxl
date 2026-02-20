import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable } from "./common";
import {
  integrationConnectionStatusEnum,
  integrationProviderEnum,
} from "./enums";
import { orgs } from "./organizations";

export const orgIntegrations = createTable(
  "org_integrations",
  (d) => ({
    id: d
      .text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: d
      .text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull().default("stripe"),
    status: integrationConnectionStatusEnum("status")
      .notNull()
      .default("disconnected"),
    stripeAccountId: d.text("stripe_account_id"),
    stripePublishableKey: d.text("stripe_publishable_key"),
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
    uniqueIndex("beamflow_org_integrations_org_provider_uidx").on(
      t.orgId,
      t.provider
    ),
    index("beamflow_org_integrations_org_provider_idx").on(t.orgId, t.provider),
  ]
);
