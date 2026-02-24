import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { agentGoalProgress, agentGoals } from "@/server/db/schema";

export const goalsDashboardRouter = createTRPCRouter({
  summary: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [counts, latestProgress] = await Promise.all([
        ctx.db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_count,
            COUNT(*) FILTER (WHERE status = 'AT_RISK')::int AS at_risk_count,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_count,
            COUNT(*)::int AS total_count
          FROM beamflow_agent_goals
          WHERE org_id = ${input.orgId}
        `),
        ctx.db.query.agentGoalProgress.findMany({
          where: (p, { eq }) => eq(p.orgId, input.orgId),
          orderBy: (p, { desc }) => [desc(p.measuredAt)],
          limit: 20,
        }),
      ]);

      const row = (counts[0] ?? {}) as Record<string, unknown>;
      return {
        totalGoals: Number(row.total_count ?? 0),
        activeGoals: Number(row.active_count ?? 0),
        atRiskGoals: Number(row.at_risk_count ?? 0),
        completedGoals: Number(row.completed_count ?? 0),
        latestProgress,
      };
    }),

  byGoal: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        goalId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [goal, progress] = await Promise.all([
        ctx.db.query.agentGoals.findFirst({
          where: (g, { and, eq }) => and(eq(g.orgId, input.orgId), eq(g.id, input.goalId)),
        }),
        ctx.db.query.agentGoalProgress.findMany({
          where: (p, { and, eq }) => and(eq(p.orgId, input.orgId), eq(p.goalId, input.goalId)),
          orderBy: (p, { desc }) => [desc(p.measuredAt)],
          limit: 50,
        }),
      ]);

      if (!goal) {
        throw new Error("Goal not found");
      }

      return { goal, progress };
    }),
});
