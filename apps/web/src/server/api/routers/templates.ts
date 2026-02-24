import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { messageTemplates } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import { ensureMvpTemplatesForOrg } from "@/server/services/template-catalog.service";

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
      await ensureMvpTemplatesForOrg(input.orgId);

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
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        channel: z.enum(["WHATSAPP", "VOICE", "EMAIL", "SMS"]).optional(),
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
        subject: input.subject ?? null,
        htmlBody: input.htmlBody ?? null,
        channel: input.channel,
        version: 1,
        isActive: true,
        approvalStatus: "DRAFT",
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
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        channel: z.enum(["WHATSAPP", "VOICE", "EMAIL", "SMS"]).optional(),
        isActive: z.boolean().optional(),
        approvalStatus: z
          .enum(["DRAFT", "PENDING", "APPROVED", "REJECTED", "LOCKED"])
          .optional(),
        complianceLocked: z.boolean().optional(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(messageTemplates)
        .set({
          body: input.body,
          subject: input.subject,
          htmlBody: input.htmlBody,
          channel: input.channel,
          isActive: input.isActive,
          approvalStatus: input.approvalStatus,
          complianceLocked: input.complianceLocked,
          rejectionReason: input.rejectionReason,
          approvedAt:
            input.approvalStatus === "APPROVED" ? new Date() : undefined,
          approvedByUserId:
            input.approvalStatus === "APPROVED" ? ctx.session.user.id : undefined,
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
        after: {
          body: input.body,
          subject: input.subject,
          channel: input.channel,
          isActive: input.isActive,
          approvalStatus: input.approvalStatus,
          complianceLocked: input.complianceLocked,
        },
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
