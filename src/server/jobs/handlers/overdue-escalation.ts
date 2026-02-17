import { and, eq, lt } from "drizzle-orm";

import { db } from "@/server/db";
import { invoices } from "@/server/db/schema";

export async function handleOverdueEscalationJob(payload: {
  orgId: string;
  runDate: string;
}) {
  const targetDate = payload.runDate;

  await db
    .update(invoices)
    .set({
      status: "OVERDUE",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(invoices.orgId, payload.orgId),
        eq(invoices.status, "DUE"),
        lt(invoices.dueDate, targetDate)
      )
    );
}
