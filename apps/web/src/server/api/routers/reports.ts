import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { flows, invoices } from "@/server/db/schema";
import { toStoredInvoiceStatus } from "@/server/services/invoice-status.service";

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfUtcDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function csvEscape(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export const reportsRouter = createTRPCRouter({
  dashboardMetrics: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const orgId = input.orgId;

      // --- DSO: (Total AR / Total Credit Sales in 90 days) * 90 ---
      const dsoResult = await ctx.db.execute(sql`
        SELECT
          COALESCE(SUM(amount_due_minor - amount_paid_minor) FILTER (
            WHERE status NOT IN ('PAID', 'CANCELED', 'CANCELLED', 'DRAFT')
          ), 0)::bigint AS total_ar,
          COALESCE(SUM(amount_due_minor) FILTER (
            WHERE created_at >= NOW() - INTERVAL '90 days'
              AND status NOT IN ('CANCELED', 'CANCELLED', 'DRAFT')
          ), 0)::bigint AS total_sales_90d
        FROM beamflow_invoices
        WHERE org_id = ${orgId}
          AND deleted_at IS NULL
      `);
      const totalAr = Number((dsoResult[0] as Record<string, unknown>)?.total_ar ?? 0);
      const totalSales90d = Number((dsoResult[0] as Record<string, unknown>)?.total_sales_90d ?? 0);
      const dso = totalSales90d > 0 ? Math.round((totalAr / totalSales90d) * 90) : 0;

      // --- Aging Buckets ---
      const agingResult = await ctx.db.execute(sql`
        SELECT
          COALESCE(SUM(amount_due_minor - amount_paid_minor) FILTER (
            WHERE due_date >= CURRENT_DATE
          ), 0)::bigint AS current_bucket,
          COALESCE(SUM(amount_due_minor - amount_paid_minor) FILTER (
            WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30
          ), 0)::bigint AS days_1_to_30,
          COALESCE(SUM(amount_due_minor - amount_paid_minor) FILTER (
            WHERE due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60
          ), 0)::bigint AS days_31_to_60,
          COALESCE(SUM(amount_due_minor - amount_paid_minor) FILTER (
            WHERE due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90
          ), 0)::bigint AS days_61_to_90,
          COALESCE(SUM(amount_due_minor - amount_paid_minor) FILTER (
            WHERE due_date < CURRENT_DATE - 90
          ), 0)::bigint AS days_90_plus
        FROM beamflow_invoices
        WHERE org_id = ${orgId}
          AND status NOT IN ('PAID', 'CANCELED', 'CANCELLED', 'DRAFT')
          AND deleted_at IS NULL
      `);
      const agingRow = (agingResult[0] ?? {}) as Record<string, unknown>;
      const agingBuckets = {
        current: Number(agingRow["current_bucket"] ?? 0),
        days1to30: Number(agingRow["days_1_to_30"] ?? 0),
        days31to60: Number(agingRow["days_31_to_60"] ?? 0),
        days61to90: Number(agingRow["days_61_to_90"] ?? 0),
        days90plus: Number(agingRow["days_90_plus"] ?? 0),
      };

      // --- Cash Collected: last 12 months ---
      const cashResult = await ctx.db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') AS month,
          COALESCE(SUM(amount_minor), 0)::bigint AS total_minor
        FROM beamflow_payments
        WHERE org_id = ${orgId}
          AND status = 'SUCCEEDED'
          AND paid_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY DATE_TRUNC('month', paid_at) ASC
      `);
      const cashCollected = (cashResult as Array<{ month: string; total_minor: string | number }>).map(
        (row) => ({
          month: row.month,
          totalMinor: Number(row.total_minor),
        })
      );

      // --- Collection Rate: last 12 weeks ---
      const collectionResult = await ctx.db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS week,
          COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid_count,
          COUNT(*)::int AS total_count
        FROM beamflow_invoices
        WHERE org_id = ${orgId}
          AND status NOT IN ('DRAFT')
          AND deleted_at IS NULL
          AND created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '11 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY DATE_TRUNC('week', created_at) ASC
      `);
      const collectionRate = (
        collectionResult as Array<{
          week: string;
          paid_count: number;
          total_count: number;
        }>
      ).map((row) => ({
        week: row.week,
        paidCount: Number(row.paid_count),
        totalCount: Number(row.total_count),
      }));

      // --- Top Delinquent: top 10 contacts by overdue amount ---
      const delinquentResult = await ctx.db.execute(sql`
        SELECT
          c.id AS contact_id,
          c.name AS contact_name,
          COALESCE(SUM(i.amount_due_minor - i.amount_paid_minor), 0)::bigint AS overdue_amount,
          COUNT(i.id)::int AS overdue_count
        FROM beamflow_invoices i
        JOIN beamflow_contacts c ON c.id = i.contact_id
        WHERE i.org_id = ${orgId}
          AND i.status = 'OVERDUE'
          AND i.deleted_at IS NULL
          AND c.deleted_at IS NULL
        GROUP BY c.id, c.name
        ORDER BY overdue_amount DESC
        LIMIT 10
      `);
      const topDelinquent = (
        delinquentResult as Array<{
          contact_id: string;
          contact_name: string;
          overdue_amount: string | number;
          overdue_count: number;
        }>
      ).map((row) => ({
        contactId: row.contact_id,
        contactName: row.contact_name,
        overdueAmount: Number(row.overdue_amount),
        overdueCount: Number(row.overdue_count),
      }));

      // --- Total Outstanding ---
      const totalOutstanding = totalAr;

      // --- Total Collected in Last 30 Days ---
      const collected30dResult = await ctx.db.execute(sql`
        SELECT COALESCE(SUM(amount_minor), 0)::bigint AS total
        FROM beamflow_payments
        WHERE org_id = ${orgId}
          AND status = 'SUCCEEDED'
          AND paid_at >= NOW() - INTERVAL '30 days'
      `);
      const totalCollected30d = Number((collected30dResult[0] as Record<string, unknown>)?.total ?? 0);

      // --- Invoice Counts ---
      const countResult = await ctx.db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'OVERDUE')::int AS overdue,
          COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid,
          COUNT(*) FILTER (WHERE status = 'DUE')::int AS due
        FROM beamflow_invoices
        WHERE org_id = ${orgId}
          AND deleted_at IS NULL
          AND status NOT IN ('DRAFT', 'CANCELED', 'CANCELLED')
      `);
      const countRow = (countResult[0] ?? {}) as Record<string, unknown>;
      const invoiceCount = {
        total: Number(countRow.total ?? 0),
        overdue: Number(countRow.overdue ?? 0),
        paid: Number(countRow.paid ?? 0),
        due: Number(countRow.due ?? 0),
      };

      const overdueValueResult = await ctx.db.execute(sql`
        SELECT
          COALESCE(SUM(amount_due_minor - amount_paid_minor - discount_applied_minor), 0)::bigint AS overdue_value
        FROM beamflow_invoices
        WHERE org_id = ${orgId}
          AND status = 'OVERDUE'
          AND deleted_at IS NULL
      `);
      const overdueValueMinor = Number(
        (overdueValueResult[0] as Record<string, unknown>)?.overdue_value ?? 0,
      );

      const activeWorkflowsResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(flows)
        .where(and(eq(flows.orgId, orgId), eq(flows.status, "ACTIVE")));
      const activeWorkflows = Number(activeWorkflowsResult[0]?.count ?? 0);

      const monthCollectedResult = await ctx.db.execute(sql`
        SELECT COALESCE(SUM(amount_minor), 0)::bigint AS total
        FROM beamflow_payments
        WHERE org_id = ${orgId}
          AND status = 'SUCCEEDED'
          AND paid_at >= DATE_TRUNC('month', NOW())
      `);
      const totalCollectedThisMonth = Number(
        (monthCollectedResult[0] as Record<string, unknown>)?.total ?? 0,
      );

      const now = new Date();
      const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const usage = await ctx.db.query.usageCredits.findFirst({
        where: (u, { and, eq }) => and(eq(u.orgId, orgId), eq(u.cycleStart, cycleStart)),
      });

      const activeGoal = await ctx.db.query.agentGoals.findFirst({
        where: (g, { and, eq }) => and(eq(g.orgId, orgId), eq(g.status, "ACTIVE")),
        orderBy: (g, { desc }) => [desc(g.updatedAt), desc(g.createdAt)],
      });

      const latestGoalProgress = activeGoal
        ? await ctx.db.query.agentGoalProgress.findFirst({
            where: (p, { and, eq }) => and(eq(p.orgId, orgId), eq(p.goalId, activeGoal.id)),
            orderBy: (p, { desc }) => [desc(p.measuredAt)],
          })
        : null;

      const targetMinor = activeGoal?.targetAmountMinor ?? null;
      const progressMinor =
        latestGoalProgress?.valueAmountMinor ?? totalCollectedThisMonth;
      const goalPercent =
        targetMinor && targetMinor > 0
          ? Math.min(100, Math.round((progressMinor / targetMinor) * 100))
          : null;

      return {
        dso,
        agingBuckets,
        cashCollected,
        collectionRate,
        topDelinquent,
        totalOutstanding,
        totalCollected30d,
        totalCollectedThisMonth,
        invoiceCount,
        overdueValueMinor,
        activeWorkflows,
        usage: usage
          ? {
              smsUsed: usage.smsUsed,
              smsIncluded: usage.smsIncluded,
              emailUsed: usage.emailUsed,
              emailIncluded: usage.emailIncluded,
              voiceSecondsUsed: usage.voiceSecondsUsed,
              voiceSecondsIncluded: usage.voiceSecondsIncluded,
              whatsappUsed: usage.whatsappUsed,
              whatsappIncluded: usage.whatsappIncluded,
            }
          : null,
        goalWidget: activeGoal
          ? {
              goalId: activeGoal.id,
              name: activeGoal.name,
              targetAmountMinor: targetMinor,
              progressAmountMinor: progressMinor,
              goalPercent,
              status: activeGoal.status,
              measuredAt: latestGoalProgress?.measuredAt ?? null,
            }
          : null,
      };
    }),

  exportInvoicesCsv: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        dueFrom: z.string().date().optional(),
        dueTo: z.string().date().optional(),
        status: z
          .enum([
            "DRAFT",
            "SENT",
            "VIEWED",
            "DUE",
            "OVERDUE",
            "PARTIAL",
            "PAID",
            "FAILED",
            "CANCELED",
            "CANCELLED",
            "WRITTEN_OFF",
            "IN_DISPUTE",
          ])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storedStatus = input.status ? toStoredInvoiceStatus(input.status) : undefined;

      const whereClause = and(
        eq(invoices.orgId, input.orgId),
        storedStatus ? eq(invoices.status, storedStatus) : undefined,
        input.dueFrom ? gte(invoices.dueDate, startOfUtcDay(input.dueFrom)) : undefined,
        input.dueTo ? lte(invoices.dueDate, endOfUtcDay(input.dueTo)) : undefined
      );

      const rows = await ctx.db.query.invoices.findMany({
        where: whereClause,
        with: {
          contact: true,
        },
        orderBy: (i, { desc }) => [desc(i.createdAt)],
      });

      const header = [
        "invoiceId",
        "invoiceNumber",
        "contactName",
        "dueDate",
        "status",
        "amountDueMinor",
        "amountPaidMinor",
        "currency",
      ];

      const lines = rows.map((row) =>
        [
          row.id,
          row.invoiceNumber,
          row.contact?.name,
          row.dueDate.toISOString(),
          row.status,
          row.amountDueMinor,
          row.amountPaidMinor,
          row.currency,
        ]
          .map(csvEscape)
          .join(",")
      );

      const csv = [header.join(","), ...lines].join("\n");
      const encoded = Buffer.from(csv, "utf8").toString("base64");

      return {
        downloadUrl: `data:text/csv;base64,${encoded}`,
      };
    }),
});
