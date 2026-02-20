import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, orgProcedure } from "@/server/api/trpc";
import {
  agentDecisions,
  agentGoals,
  agentGoalProgress,
  agentTasks,
  approvalRequests,
} from "@/server/db/schema";
import { runAgentTask } from "@/server/services/ai-runtime.service";
import { writeAuditLog } from "@/server/services/audit.service";

export const agentRouter = createTRPCRouter({
  overview: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [goalsRows, tasksRows, approvalsRows] = await Promise.all([
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(agentGoals)
          .where(eq(agentGoals.orgId, input.orgId)),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(agentTasks)
          .where(eq(agentTasks.orgId, input.orgId)),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(approvalRequests)
          .where(and(eq(approvalRequests.orgId, input.orgId), eq(approvalRequests.status, "RECEIVED"))),
      ]);

      return {
        goals: Number(goalsRows[0]?.count ?? 0),
        tasks: Number(tasksRows[0]?.count ?? 0),
        pendingApprovals: Number(approvalsRows[0]?.count ?? 0),
      };
    }),

  listGoals: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentGoals.findMany({
        where: (g, { eq }) => eq(g.orgId, input.orgId),
        orderBy: (g, { desc }) => [desc(g.createdAt)],
      });
    }),

  upsertGoal: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        goalId: z.string().optional(),
        goalType: z.enum([
          "MONTHLY_COLLECTION_TARGET",
          "DSO_TARGET",
          "RECOVERY_RATE_TARGET",
          "CLEAR_OVERDUE_BEFORE_DATE",
        ]),
        name: z.string().min(2),
        targetAmountMinor: z.number().int().optional(),
        targetPercent: z.number().int().optional(),
        targetDays: z.number().int().optional(),
        targetDate: z.string().date().optional(),
        status: z.enum(["ACTIVE", "AT_RISK", "COMPLETED", "PAUSED"]).default("ACTIVE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goalId = input.goalId ?? crypto.randomUUID();

      if (input.goalId) {
        await ctx.db
          .update(agentGoals)
          .set({
            goalType: input.goalType,
            name: input.name,
            targetAmountMinor: input.targetAmountMinor,
            targetPercent: input.targetPercent,
            targetDays: input.targetDays,
            targetDate: input.targetDate,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(and(eq(agentGoals.id, input.goalId), eq(agentGoals.orgId, input.orgId)));
      } else {
        await ctx.db.insert(agentGoals).values({
          id: goalId,
          orgId: input.orgId,
          goalType: input.goalType,
          name: input.name,
          targetAmountMinor: input.targetAmountMinor,
          targetPercent: input.targetPercent,
          targetDays: input.targetDays,
          targetDate: input.targetDate,
          status: input.status,
          createdByUserId: ctx.session.user.id,
        });
      }

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "AGENT_GOAL_UPSERTED",
        entityType: "AgentGoal",
        entityId: goalId,
        after: input,
      });

      return { goalId };
    }),

  recordGoalProgress: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        goalId: z.string().min(1),
        valueAmountMinor: z.number().int().optional(),
        valuePercent: z.number().int().optional(),
        valueDays: z.number().int().optional(),
        isOnTrack: z.boolean().default(true),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const progressId = crypto.randomUUID();
      await ctx.db.insert(agentGoalProgress).values({
        id: progressId,
        goalId: input.goalId,
        orgId: input.orgId,
        valueAmountMinor: input.valueAmountMinor,
        valuePercent: input.valuePercent,
        valueDays: input.valueDays,
        isOnTrack: input.isOnTrack,
        note: input.note,
      });

      return { progressId };
    }),

  listTasks: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: z
          .enum(["DRAFT", "AWAITING_APPROVAL", "RUNNING", "COMPLETED", "FAILED", "CANCELED"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentTasks.findMany({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, input.orgId), input.status ? eq(t.status, input.status) : undefined),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
    }),

  createTask: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        sourceChannel: z.enum(["WHATSAPP", "VOICE", "EMAIL", "SMS"]).default("WHATSAPP"),
        prompt: z.string().min(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const taskId = crypto.randomUUID();

      await ctx.db.insert(agentTasks).values({
        id: taskId,
        orgId: input.orgId,
        sourceChannel: input.sourceChannel,
        prompt: input.prompt,
        status: "RUNNING",
        createdByUserId: ctx.session.user.id,
        startedAt: new Date(),
      });

      const result = await runAgentTask({
        orgId: input.orgId,
        taskId,
        prompt: input.prompt,
      });

      await ctx.db
        .update(agentTasks)
        .set({
          normalizedIntent: result.intent,
          executionPlan: result.plan as Record<string, unknown>,
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(agentTasks.id, taskId), eq(agentTasks.orgId, input.orgId)));

      await ctx.db.insert(agentDecisions).values({
        orgId: input.orgId,
        decisionType: "TASK_INTERPRETATION",
        reason: result.summary,
        policyChecks: result.policyChecks as Record<string, unknown>,
        modelProvider: result.model.provider,
        modelName: result.model.model,
        traceId: result.model.traceId,
      });

      return { taskId, result };
    }),

  listDecisions: orgProcedure
    .input(z.object({ orgId: z.string().min(1), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agentDecisions.findMany({
        where: (d, { eq }) => eq(d.orgId, input.orgId),
        orderBy: (d, { desc }) => [desc(d.createdAt)],
        limit: input.limit,
      });
    }),
});
