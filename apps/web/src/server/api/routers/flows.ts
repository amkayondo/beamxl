import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  automationAdminProcedure,
  automationProcedure,
  createTRPCRouter,
} from "@/server/api/trpc";
import { flows } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import { createStarterFlow } from "@/lib/flows/starter-flow";

const listInput = z.object({
  orgId: z.string().min(1),
  query: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const flowsRouter = createTRPCRouter({
  list: automationProcedure.input(listInput).query(async ({ ctx, input }) => {
    const offset = (input.page - 1) * input.pageSize;

    const whereClause = and(
      eq(flows.orgId, input.orgId),
      isNull(flows.deletedAt),
      input.query ? ilike(flows.name, `%${input.query}%`) : undefined,
      input.status ? eq(flows.status, input.status) : undefined
    );

    const [items, countRows] = await Promise.all([
      ctx.db.query.flows.findMany({
        where: whereClause,
        orderBy: (f, { desc }) => [desc(f.updatedAt)],
        offset,
        limit: input.pageSize,
      }),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(flows)
        .where(whereClause),
    ]);

    return {
      items,
      total: Number(countRows[0]?.count ?? 0),
    };
  }),

  byId: automationProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        flowId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.flows.findFirst({
        where: (f, { and, eq }) =>
          and(eq(f.orgId, input.orgId), eq(f.id, input.flowId)),
        with: {
          runs: {
            orderBy: (r, { desc }) => [desc(r.createdAt)],
            limit: 10,
          },
        },
      });
    }),

  create: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const flowId = crypto.randomUUID();

      const starter = createStarterFlow({
        orgSlug: "",
        flowId,
        name: input.name ?? "Untitled Flow",
        updatedBy: ctx.session.user.name ?? ctx.session.user.email ?? "Unknown",
      });

      await ctx.db.insert(flows).values({
        id: flowId,
        orgId: input.orgId,
        name: starter.name,
        status: "DRAFT",
        nodesJson: starter.nodes,
        edgesJson: starter.edges,
        viewportJson: starter.viewport,
        updatedByUserId: ctx.session.user.id,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "FLOW_CREATED",
        entityType: "Flow",
        entityId: flowId,
        after: { name: starter.name },
      });

      return { id: flowId };
    }),

  update: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        flowId: z.string().min(1),
        name: z.string().min(1).optional(),
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED"]).optional(),
        nodesJson: z.any().optional(),
        edgesJson: z.any().optional(),
        viewportJson: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const setFields: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedByUserId: ctx.session.user.id,
      };

      if (input.name !== undefined) setFields.name = input.name;
      if (input.status !== undefined) setFields.status = input.status;
      if (input.nodesJson !== undefined) setFields.nodesJson = input.nodesJson;
      if (input.edgesJson !== undefined) setFields.edgesJson = input.edgesJson;
      if (input.viewportJson !== undefined) setFields.viewportJson = input.viewportJson;

      await ctx.db
        .update(flows)
        .set(setFields)
        .where(
          and(eq(flows.id, input.flowId), eq(flows.orgId, input.orgId))
        );

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "FLOW_UPDATED",
        entityType: "Flow",
        entityId: input.flowId,
        after: {
          name: input.name,
          status: input.status,
        },
      });

      return { ok: true };
    }),

  delete: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        flowId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(flows)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(flows.id, input.flowId), eq(flows.orgId, input.orgId))
        );

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "FLOW_DELETED",
        entityType: "Flow",
        entityId: input.flowId,
      });

      return { ok: true };
    }),

  duplicate: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        flowId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.flows.findFirst({
        where: (f, { and, eq }) =>
          and(eq(f.orgId, input.orgId), eq(f.id, input.flowId)),
      });

      if (!existing) {
        throw new Error("Flow not found");
      }

      const newId = crypto.randomUUID();

      await ctx.db.insert(flows).values({
        id: newId,
        orgId: input.orgId,
        name: `${existing.name} (Copy)`,
        status: "DRAFT",
        nodesJson: existing.nodesJson,
        edgesJson: existing.edgesJson,
        viewportJson: existing.viewportJson,
        updatedByUserId: ctx.session.user.id,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "FLOW_DUPLICATED",
        entityType: "Flow",
        entityId: newId,
        after: { name: `${existing.name} (Copy)`, sourceFlowId: input.flowId },
      });

      return { id: newId };
    }),

  testRun: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        flowId: z.string().min(1),
        mockContext: z
          .object({
            eventType: z.string(),
            amount: z.number().optional(),
            daysOverdue: z.number().optional(),
            contactTags: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { executeFlowById } = await import(
        "@/server/services/flow-executor.service"
      );

      const log = await executeFlowById({
        orgId: input.orgId,
        flowId: input.flowId,
        mode: "dry-run",
        eventContext: {
          orgId: input.orgId,
          eventType: (input.mockContext?.eventType ?? "Invoice Overdue") as any,
          amount: input.mockContext?.amount,
          daysOverdue: input.mockContext?.daysOverdue,
          contactTags: input.mockContext?.contactTags,
        },
      });

      return { log };
    }),
});
