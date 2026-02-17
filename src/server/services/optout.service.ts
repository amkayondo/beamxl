import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";

export async function markContactOptedOut(input: {
  orgId: string;
  contactId: string;
  reason?: string;
}) {
  await db
    .update(contacts)
    .set({
      optedOutAt: new Date(),
      optOutReason: input.reason ?? "STOP",
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.orgId, input.orgId), eq(contacts.id, input.contactId)));
}

export async function isStopKeyword(message: string) {
  const normalized = message.trim().toUpperCase();
  return normalized === "STOP";
}
