import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { messageTemplates } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";

export const templatesRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const whereClause = eq(messageTemplates.orgId, input.orgId);

      const [items, countRows] = await Promise.all([
        ctx.db.query.messageTemplates.findMany({
          where: whereClause,
          orderBy: (t, { asc, desc }) => [asc(t.key), desc(t.version)],
          offset,
          limit: input.pageSize,
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(messageTemplates)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  byId: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        templateId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.messageTemplates.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, input.orgId), eq(t.id, input.templateId)),
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        key: z.string().min(1),
        language: z.enum(["EN", "RW", "LG"]).default("EN"),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const templateId = crypto.randomUUID();

      await ctx.db.insert(messageTemplates).values({
        id: templateId,
        orgId: input.orgId,
        key: input.key,
        language: input.language,
        body: input.body,
        version: 1,
        isActive: true,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "TEMPLATE_CREATED",
        entityType: "MessageTemplate",
        entityId: templateId,
        after: { key: input.key, language: input.language },
      });

      return { id: templateId };
    }),

  update: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        templateId: z.string().min(1),
        body: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(messageTemplates)
        .set({
          body: input.body,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(messageTemplates.id, input.templateId),
            eq(messageTemplates.orgId, input.orgId)
          )
        );

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "TEMPLATE_UPDATED",
        entityType: "MessageTemplate",
        entityId: input.templateId,
        after: { body: input.body, isActive: input.isActive },
      });

      return { ok: true };
    }),

  activate: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        templateId: z.string().min(1),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(messageTemplates)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(
          and(
            eq(messageTemplates.id, input.templateId),
            eq(messageTemplates.orgId, input.orgId)
          )
        );

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: input.isActive ? "TEMPLATE_ACTIVATED" : "TEMPLATE_DEACTIVATED",
        entityType: "MessageTemplate",
        entityId: input.templateId,
      });

      return { ok: true };
    }),
});
