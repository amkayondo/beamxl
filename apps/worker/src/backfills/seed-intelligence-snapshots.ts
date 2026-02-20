import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@dueflow/db";
import {
  channelEffectivenessDaily,
  clientRiskScores,
  contacts,
  forecastSnapshots,
  invoiceHealthScores,
  invoices,
  messageLogs,
  orgs,
} from "@dueflow/db";

function startOfUtcDay(input = new Date()) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function endOfUtcDay(input = new Date()) {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 23, 59, 59, 999)
  );
}

function toRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 75) return "LOW";
  if (score >= 55) return "MEDIUM";
  if (score >= 35) return "HIGH";
  return "CRITICAL";
}

function toHealth(score: number): "HEALTHY" | "AT_RISK" | "CRITICAL" {
  if (score >= 70) return "HEALTHY";
  if (score >= 40) return "AT_RISK";
  return "CRITICAL";
}

async function upsertClientRiskForOrg(orgId: string, computedAt: Date) {
  const orgContacts = await db.query.contacts.findMany({
    where: (c, { and, eq, isNull }) => and(eq(c.orgId, orgId), isNull(c.deletedAt)),
  });

  let writes = 0;

  for (const contact of orgContacts) {
    const contactInvoices = await db.query.invoices.findMany({
      where: (i, { and, eq, isNull }) =>
        and(eq(i.orgId, orgId), eq(i.contactId, contact.id), isNull(i.deletedAt)),
    });

    const outstandingMinor = contactInvoices.reduce(
      (sum, inv) => sum + Math.max(inv.amountDueMinor - inv.amountPaidMinor, 0),
      0
    );
    const overdueCount = contactInvoices.filter((inv) => inv.status === "OVERDUE").length;
    const paidCount = contactInvoices.filter((inv) => inv.status === "PAID").length;

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - overdueCount * 18 - Math.min(30, outstandingMinor / 20000) + paidCount * 2)
      )
    );

    const existing = await db.query.clientRiskScores.findFirst({
      where: (r, { and, eq }) =>
        and(eq(r.orgId, orgId), eq(r.contactId, contact.id), eq(r.computedAt, computedAt)),
    });

    if (existing) {
      await db
        .update(clientRiskScores)
        .set({
          riskLevel: toRiskLevel(score),
          score,
          factors: {
            outstandingMinor,
            overdueCount,
            paidCount,
          },
        })
        .where(eq(clientRiskScores.id, existing.id));
    } else {
      await db.insert(clientRiskScores).values({
        id: crypto.randomUUID(),
        orgId,
        contactId: contact.id,
        riskLevel: toRiskLevel(score),
        score,
        factors: {
          outstandingMinor,
          overdueCount,
          paidCount,
        },
        computedAt,
      });
    }

    writes += 1;
  }

  return writes;
}

async function upsertInvoiceHealthForOrg(orgId: string, computedAt: Date) {
  const now = new Date();
  const orgInvoices = await db.query.invoices.findMany({
    where: (i, { and, eq, isNull }) => and(eq(i.orgId, orgId), isNull(i.deletedAt)),
  });

  let writes = 0;

  for (const invoice of orgInvoices) {
    const outstandingMinor = Math.max(invoice.amountDueMinor - invoice.amountPaidMinor, 0);
    const paidRatio = invoice.amountDueMinor > 0 ? invoice.amountPaidMinor / invoice.amountDueMinor : 1;
    const daysOverdue = Math.max(
      0,
      Math.floor((now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000))
    );

    const score = Math.max(
      0,
      Math.min(100, Math.round(100 - daysOverdue * 8 - (1 - paidRatio) * 35 - (outstandingMinor > 0 ? 10 : 0)))
    );

    const existing = await db.query.invoiceHealthScores.findFirst({
      where: (h, { and, eq }) =>
        and(eq(h.orgId, orgId), eq(h.invoiceId, invoice.id), eq(h.computedAt, computedAt)),
    });

    if (existing) {
      await db
        .update(invoiceHealthScores)
        .set({
          health: toHealth(score),
          score,
          factors: {
            daysOverdue,
            paidRatio,
            outstandingMinor,
          },
        })
        .where(eq(invoiceHealthScores.id, existing.id));
    } else {
      await db.insert(invoiceHealthScores).values({
        id: crypto.randomUUID(),
        orgId,
        invoiceId: invoice.id,
        health: toHealth(score),
        score,
        predictedPaidAt:
          outstandingMinor > 0 ? new Date(now.getTime() + Math.max(1, daysOverdue + 7) * 86400000) : now,
        modelVersion: "v1-backfill",
        factors: {
          daysOverdue,
          paidRatio,
          outstandingMinor,
        },
        computedAt,
      });
    }

    writes += 1;
  }

  return writes;
}

async function upsertForecastForOrg(orgId: string, generatedAt: Date) {
  const outstanding = await db
    .select({
      outstandingMinor: sql<number>`COALESCE(SUM(GREATEST(${invoices.amountDueMinor} - ${invoices.amountPaidMinor}, 0)), 0)`,
      overdueMinor: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'OVERDUE' THEN GREATEST(${invoices.amountDueMinor} - ${invoices.amountPaidMinor}, 0) ELSE 0 END), 0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt)));

  const outstandingMinor = Number(outstanding[0]?.outstandingMinor ?? 0);
  const overdueMinor = Number(outstanding[0]?.overdueMinor ?? 0);
  const overdueRatio = outstandingMinor === 0 ? 0 : overdueMinor / outstandingMinor;

  for (const horizonDays of [30, 60, 90] as const) {
    const collectability = Math.max(0.25, 0.9 - overdueRatio * 0.45 + horizonDays / 400);
    const projectedCollectionsMinor = Math.round(outstandingMinor * collectability);
    const atRiskMinor = Math.max(0, outstandingMinor - projectedCollectionsMinor);

    const existing = await db.query.forecastSnapshots.findFirst({
      where: (f, { and, eq, gte, lt }) =>
        and(
          eq(f.orgId, orgId),
          eq(f.horizonDays, horizonDays),
          gte(f.generatedAt, generatedAt),
          lt(f.generatedAt, endOfUtcDay(generatedAt))
        ),
      orderBy: (f, { desc }) => [desc(f.generatedAt)],
    });

    if (existing) {
      await db
        .update(forecastSnapshots)
        .set({
          projectedCollectionsMinor,
          atRiskMinor,
          modelVersion: "v1-backfill",
          breakdown: {
            outstandingMinor,
            overdueMinor,
            overdueRatio,
            collectability,
          },
        })
        .where(eq(forecastSnapshots.id, existing.id));
    } else {
      await db.insert(forecastSnapshots).values({
        id: crypto.randomUUID(),
        orgId,
        horizonDays,
        projectedCollectionsMinor,
        atRiskMinor,
        modelVersion: "v1-backfill",
        breakdown: {
          outstandingMinor,
          overdueMinor,
          overdueRatio,
          collectability,
        },
        generatedAt,
      });
    }
  }

  return 3;
}

async function upsertChannelDailyForOrg(orgId: string, dayStart: Date) {
  const day = dayStart.toISOString().slice(0, 10);
  const dayEnd = endOfUtcDay(dayStart);

  const outboundByChannel = await db
    .select({
      channel: messageLogs.channel,
      sentCount: sql<number>`count(*)`,
    })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.orgId, orgId),
        eq(messageLogs.direction, "OUTBOUND"),
        gte(messageLogs.createdAt, dayStart),
        lt(messageLogs.createdAt, dayEnd)
      )
    )
    .groupBy(messageLogs.channel);

  const inboundByChannel = await db
    .select({
      channel: messageLogs.channel,
      replyCount: sql<number>`count(*)`,
    })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.orgId, orgId),
        eq(messageLogs.direction, "INBOUND"),
        gte(messageLogs.createdAt, dayStart),
        lt(messageLogs.createdAt, dayEnd)
      )
    )
    .groupBy(messageLogs.channel);

  const replyMap = new Map<string, number>();
  for (const row of inboundByChannel) {
    replyMap.set(String(row.channel), Number(row.replyCount ?? 0));
  }

  let writes = 0;
  for (const row of outboundByChannel) {
    const channel = String(row.channel) as "SMS" | "VOICE" | "EMAIL" | "WHATSAPP";
    const sentCount = Number(row.sentCount ?? 0);
    const replyCount = replyMap.get(channel) ?? 0;

    await db
      .insert(channelEffectivenessDaily)
      .values({
        id: crypto.randomUUID(),
        orgId,
        day,
        channel,
        sentCount,
        replyCount,
        paidCount: 0,
        collectedMinor: 0,
      })
      .onConflictDoUpdate({
        target: [
          channelEffectivenessDaily.orgId,
          channelEffectivenessDaily.day,
          channelEffectivenessDaily.channel,
        ],
        set: {
          sentCount,
          replyCount,
          updatedAt: new Date(),
        },
      });

    writes += 1;
  }

  return writes;
}

async function main() {
  const dayStart = startOfUtcDay();
  const allOrgs = await db.query.orgs.findMany({
    where: (o, { isNull }) => isNull(o.deletedAt),
    columns: { id: true },
  });

  let riskWrites = 0;
  let healthWrites = 0;
  let forecastWrites = 0;
  let channelWrites = 0;

  for (const org of allOrgs) {
    riskWrites += await upsertClientRiskForOrg(org.id, dayStart);
    healthWrites += await upsertInvoiceHealthForOrg(org.id, dayStart);
    forecastWrites += await upsertForecastForOrg(org.id, dayStart);
    channelWrites += await upsertChannelDailyForOrg(org.id, dayStart);
  }

  console.log(
    `[backfill:seed-intelligence-snapshots] orgs=${allOrgs.length} risk=${riskWrites} health=${healthWrites} forecasts=${forecastWrites} channelDaily=${channelWrites}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[backfill:seed-intelligence-snapshots] failed", error);
    process.exit(1);
  });
