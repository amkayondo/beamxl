import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { integrationSettings } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  ensureEnvRefSecretStrategy,
  normalizeSecretRef,
} from "@/server/services/secret-vault.service";

export const settingsRouter = createTRPCRouter({
  listIntegrations: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.integrationSettings.findMany({
        where: (s, { and, eq, isNull }) =>
          and(eq(s.orgId, input.orgId), isNull(s.deletedAt)),
        orderBy: (s, { asc }) => [asc(s.providerKind), asc(s.provider)],
      });
    }),

  upsertIntegration: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        providerKind: z.enum(["PAYMENT", "WHATSAPP", "CALL", "VOICE"]),
        provider: z.string().min(1),
        isEnabled: z.boolean(),
        secretPlaintext: z.string().optional(),
        secretEnvRef: z.string().optional(),
        config: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      ensureEnvRefSecretStrategy();

      const existing = await ctx.db.query.integrationSettings.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.orgId, input.orgId),
            eq(s.providerKind, input.providerKind),
            eq(s.provider, input.provider)
          ),
      });

      const secretKeyRef = normalizeSecretRef({
        provider: input.provider,
        secretKeyRef: input.secretEnvRef,
      });

      if (existing) {
        await ctx.db
          .update(integrationSettings)
          .set({
            isEnabled: input.isEnabled,
            secretKeyRef,
            config: input.config,
            updatedAt: new Date(),
            deletedAt: null,
          })
          .where(and(eq(integrationSettings.id, existing.id), eq(integrationSettings.orgId, input.orgId)));

        await writeAuditLog({
          orgId: input.orgId,
          actorType: "USER",
          actorUserId: ctx.session.user.id,
          action: "INTEGRATION_UPDATED",
          entityType: "IntegrationSetting",
          entityId: existing.id,
          after: {
            providerKind: input.providerKind,
            provider: input.provider,
            isEnabled: input.isEnabled,
            secretKeyRef,
          },
        });

        return { integrationId: existing.id };
      }

      const integrationId = crypto.randomUUID();
      await ctx.db.insert(integrationSettings).values({
        id: integrationId,
        orgId: input.orgId,
        providerKind: input.providerKind,
        provider: input.provider,
        displayName: input.provider,
        isEnabled: input.isEnabled,
        secretKeyRef,
        config: input.config,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "INTEGRATION_UPDATED",
        entityType: "IntegrationSetting",
        entityId: integrationId,
        after: {
          providerKind: input.providerKind,
          provider: input.provider,
          isEnabled: input.isEnabled,
          secretKeyRef,
        },
      });

      return { integrationId };
    }),
});
