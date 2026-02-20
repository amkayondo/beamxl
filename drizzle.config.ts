import { type Config } from "drizzle-kit";

import { env } from "./apps/web/src/env";

export default {
  schema: "./apps/web/src/server/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
