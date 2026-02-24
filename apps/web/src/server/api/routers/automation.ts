import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  automationAdminProcedure,
  automationProcedure,
  createTRPCRouter,
} from "@/server/api/trpc";
import { automationRules } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import { isPhoneVerifiedForOrg } from "@/server/services/onboarding.service";

export const automationRouter = createTRPCRouter({
  list: automationProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.automationRules.findMany({
        where: (r, { and, eq, isNull }) =>
          and(eq(r.orgId, input.orgId), isNull(r.deletedAt)),
        orderBy: (r, { asc }) => [asc(r.priority), asc(r.offsetDays)],
        with: {
          template: true,
        },
      });
    }),

  upsertRule: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        ruleId: z.string().optional(),
        name: z.string().min(2),
        triggerType: z.enum(["BEFORE_DUE", "ON_DUE", "AFTER_DUE", "UNRESPONSIVE"]),
        offsetDays: z.number().int().min(-30).max(90),
        channel: z.enum(["WHATSAPP", "VOICE", "EMAIL", "SMS"]),
        templateId: z.string().optional(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.channel === "SMS" || input.channel === "VOICE") {
        const phoneVerified = await isPhoneVerifiedForOrg(ctx.db, input.orgId);
        if (!phoneVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Phone verification is required before enabling SMS or voice automation.",
          });
        }
      }

      const ruleId = input.ruleId ?? crypto.randomUUID();

      if (input.ruleId) {
        await ctx.db
          .update(automationRules)
          .set({
            name: input.name,
            triggerType: input.triggerType,
            offsetDays: input.offsetDays,
            channel: input.channel,
            templateId: input.templateId,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(automationRules.id, input.ruleId),
              eq(automationRules.orgId, input.orgId)
            )
          );
      } else {
        await ctx.db.insert(automationRules).values({
          id: ruleId,
          orgId: input.orgId,
          name: input.name,
          triggerType: input.triggerType,
          offsetDays: input.offsetDays,
          channel: input.channel,
          templateId: input.templateId,
          isActive: input.isActive,
        });
      }

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "AUTOMATION_RULE_UPSERTED",
        entityType: "AutomationRule",
        entityId: ruleId,
        after: input,
      });

      return { ruleId };
    }),

  delete: automationAdminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        ruleId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(automationRules)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(automationRules.id, input.ruleId),
            eq(automationRules.orgId, input.orgId)
          )
        );

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "AUTOMATION_RULE_DELETED",
        entityType: "AutomationRule",
        entityId: input.ruleId,
      });

      return { ok: true };
    }),
});
