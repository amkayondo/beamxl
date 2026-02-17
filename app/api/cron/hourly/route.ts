import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { invoices, orgs } from "@/server/db/schema";
import {
  enqueueOverdueTransitionJob,
  enqueueReminderJob,
} from "@/server/jobs/producers";

function dayDiff(fromIsoDate: string, to: Date) {
  const from = new Date(`${fromIsoDate}T00:00:00.000Z`);
  const toDate = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  return Math.floor((toDate.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export async function GET() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const allOrgs = await db.query.orgs.findMany({
    where: (o, { isNull }) => isNull(o.deletedAt),
  });

  for (const org of allOrgs) {
    await enqueueOverdueTransitionJob({
      orgId: org.id,
      runDate: today,
    });

    const pendingInvoices = await db.query.invoices.findMany({
      where: (i, { and, eq }) =>
        and(eq(i.orgId, org.id), eq(i.status, "SENT")),
    });

    for (const invoice of pendingInvoices) {
      const diff = dayDiff(invoice.dueDate, now);
      const templateKey =
        diff === -3
          ? "FRIENDLY_REMINDER"
          : diff === 0
            ? "DUE_TODAY"
            : diff === 1
              ? "LATE_NOTICE"
              : diff === 3
                ? "FINAL_NOTICE"
                : null;

      if (!templateKey) continue;

      await enqueueReminderJob({
        orgId: org.id,
        invoiceId: invoice.id,
        templateKey,
        scheduledAt: now.toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true, runDate: today });
}
