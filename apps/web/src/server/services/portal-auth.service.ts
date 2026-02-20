import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/server/db";

export function hashPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPortalToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function resolvePortalAccountByToken(rawToken: string) {
  const accessTokenHash = hashPortalToken(rawToken);

  return db.query.clientPortalAccounts.findFirst({
    where: (a, { and, eq }) =>
      and(eq(a.accessTokenHash, accessTokenHash), eq(a.isActive, true)),
    with: {
      contact: true,
      org: true,
    },
  });
}

export function getPortalUrl(token: string) {
  const appUrl = env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/portal/${encodeURIComponent(token)}`;
}
