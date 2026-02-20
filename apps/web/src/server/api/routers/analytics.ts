import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";

export const analyticsRouter = createTRPCRouter({
  forecast: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        horizonDays: z.enum(["30", "60", "90"]).default("30"),
      })
    )
    .query(async ({ ctx, input }) => {
      const horizon = Number(input.horizonDays);
      const snapshot = await ctx.db.query.forecastSnapshots.findFirst({
        where: (f, { and, eq }) =>
          and(eq(f.orgId, input.orgId), eq(f.horizonDays, horizon)),
        orderBy: (f, { desc }) => [desc(f.generatedAt)],
      });

      return {
        horizonDays: horizon,
        projectedCollectionsMinor: snapshot?.projectedCollectionsMinor ?? 0,
        atRiskMinor: snapshot?.atRiskMinor ?? 0,
        modelVersion: snapshot?.modelVersion ?? "v1",
        generatedAt: snapshot?.generatedAt ?? null,
        breakdown: snapshot?.breakdown ?? {},
      };
    }),

  channelEffectiveness: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        days: z.number().int().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setDate(from.getDate() - input.days);
      const fromDay = from.toISOString().slice(0, 10);

      return ctx.db.query.channelEffectivenessDaily.findMany({
        where: (c, { and, eq, gte }) =>
          and(eq(c.orgId, input.orgId), gte(c.day, fromDay)),
        orderBy: (c, { asc }) => [asc(c.day)],
      });
    }),

  riskSummary: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [riskCountsRows, healthCountsRows] = await Promise.all([
        ctx.db.execute(sql`
          SELECT risk_level AS level, COUNT(*)::int AS count
          FROM beamflow_client_risk_scores
          WHERE org_id = ${input.orgId}
            AND computed_at >= NOW() - INTERVAL '30 days'
          GROUP BY risk_level
        `),
        ctx.db.execute(sql`
          SELECT health, COUNT(*)::int AS count
          FROM beamflow_invoice_health_scores
          WHERE org_id = ${input.orgId}
            AND computed_at >= NOW() - INTERVAL '30 days'
          GROUP BY health
        `),
      ]);

      return {
        riskLevels: riskCountsRows,
        invoiceHealth: healthCountsRows,
      };
    }),

  agingAtRisk: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE i.status = 'OVERDUE')::int AS overdue_count,
          COALESCE(SUM(i.amount_due_minor - i.amount_paid_minor) FILTER (WHERE i.status = 'OVERDUE'), 0)::bigint AS overdue_minor,
          COUNT(*) FILTER (WHERE ih.health = 'CRITICAL')::int AS critical_health_count
        FROM beamflow_invoices i
        LEFT JOIN beamflow_invoice_health_scores ih
          ON ih.invoice_id = i.id
         AND ih.org_id = i.org_id
        WHERE i.org_id = ${input.orgId}
          AND i.deleted_at IS NULL
      `);

      return rows[0] ?? {};
    }),
});
