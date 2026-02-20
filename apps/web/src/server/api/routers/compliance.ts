import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import {
  complianceSettings,
  contactConsents,
  stateComplianceRules,
} from "@/server/db/schema";
import {
  getContactComplianceStatus,
  recordConsent,
} from "@/server/services/compliance.service";

export const complianceRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // getSettings — get compliance settings for an org, create default if none
  // -------------------------------------------------------------------------
  getSettings: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      let settings = await ctx.db.query.complianceSettings.findFirst({
        where: (s: any, { eq }: any) => eq(s.orgId, input.orgId),
      });

      if (!settings) {
        const id = crypto.randomUUID();
        await ctx.db.insert(complianceSettings).values({
          id,
          orgId: input.orgId,
        });
        settings = await ctx.db.query.complianceSettings.findFirst({
          where: (s: any, { eq }: any) => eq(s.orgId, input.orgId),
        });
      }

      return settings!;
    }),

  // -------------------------------------------------------------------------
  // updateSettings — update compliance settings (admin only)
  // -------------------------------------------------------------------------
  updateSettings: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        defaultFrequencyCap: z.number().int().min(1).optional(),
        frequencyWindowDays: z.number().int().min(1).optional(),
        quietHoursStart: z.number().int().min(0).max(23).optional(),
        quietHoursEnd: z.number().int().min(0).max(23).optional(),
        defaultTimezone: z.string().min(1).optional(),
        enforceTcpa: z.boolean().optional(),
        enforceFdcpa: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId, ...fields } = input;

      // Ensure settings exist
      let settings = await ctx.db.query.complianceSettings.findFirst({
        where: (s: any, { eq }: any) => eq(s.orgId, orgId),
      });

      if (!settings) {
        const id = crypto.randomUUID();
        await ctx.db.insert(complianceSettings).values({
          id,
          orgId,
        });
        settings = await ctx.db.query.complianceSettings.findFirst({
          where: (s: any, { eq }: any) => eq(s.orgId, orgId),
        });
      }

      await ctx.db
        .update(complianceSettings)
        .set({
          ...fields,
          updatedAt: new Date(),
        })
        .where(eq(complianceSettings.orgId, orgId));

      return { ok: true };
    }),

  // -------------------------------------------------------------------------
  // listStateRules — list state compliance rules for an org
  // -------------------------------------------------------------------------
  listStateRules: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.stateComplianceRules.findMany({
        where: (r: any, { eq }: any) => eq(r.orgId, input.orgId),
        orderBy: (r: any, { asc }: any) => [asc(r.stateCode)],
      });
    }),

  // -------------------------------------------------------------------------
  // upsertStateRule — insert or update a state rule (admin only)
  // -------------------------------------------------------------------------
  upsertStateRule: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        stateCode: z.string().min(2).max(2),
        frequencyCap: z.number().int().min(1),
        frequencyWindowDays: z.number().int().min(1).default(7),
        quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
        quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.stateComplianceRules.findFirst({
        where: (r: any, { and, eq }: any) =>
          and(eq(r.orgId, input.orgId), eq(r.stateCode, input.stateCode)),
      });

      if (existing) {
        await ctx.db
          .update(stateComplianceRules)
          .set({
            frequencyCap: input.frequencyCap,
            frequencyWindowDays: input.frequencyWindowDays,
            quietHoursStart: input.quietHoursStart ?? null,
            quietHoursEnd: input.quietHoursEnd ?? null,
            notes: input.notes ?? null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stateComplianceRules.id, existing.id),
              eq(stateComplianceRules.orgId, input.orgId),
            ),
          );

        return { ruleId: existing.id };
      }

      const ruleId = crypto.randomUUID();
      await ctx.db.insert(stateComplianceRules).values({
        id: ruleId,
        orgId: input.orgId,
        stateCode: input.stateCode,
        frequencyCap: input.frequencyCap,
        frequencyWindowDays: input.frequencyWindowDays,
        quietHoursStart: input.quietHoursStart ?? null,
        quietHoursEnd: input.quietHoursEnd ?? null,
        notes: input.notes ?? null,
      });

      return { ruleId };
    }),

  // -------------------------------------------------------------------------
  // deleteStateRule — delete a state rule by id (admin only)
  // -------------------------------------------------------------------------
  deleteStateRule: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        ruleId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(stateComplianceRules)
        .where(
          and(
            eq(stateComplianceRules.id, input.ruleId),
            eq(stateComplianceRules.orgId, input.orgId),
          ),
        );

      return { ok: true };
    }),

  // -------------------------------------------------------------------------
  // listConsents — list contactConsents for a contactId
  // -------------------------------------------------------------------------
  listConsents: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.contactConsents.findMany({
        where: (cc: any, { and, eq }: any) =>
          and(eq(cc.orgId, input.orgId), eq(cc.contactId, input.contactId)),
        orderBy: (cc: any, { desc }: any) => [desc(cc.createdAt)],
      });
    }),

  // -------------------------------------------------------------------------
  // recordConsent — record a new consent (admin only)
  // -------------------------------------------------------------------------
  recordConsent: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        channel: z.enum(["SMS", "WHATSAPP", "VOICE", "EMAIL"]),
        method: z.enum(["WRITTEN", "VERBAL", "ELECTRONIC", "IMPORTED"]),
        evidenceUrl: z.string().optional(),
        ipAddress: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return recordConsent(input);
    }),

  // -------------------------------------------------------------------------
  // revokeConsent — revoke a consent by id (admin only)
  // -------------------------------------------------------------------------
  revokeConsent: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        consentId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(contactConsents)
        .set({
          revokedAt: new Date(),
          revokeMethod: "MANUAL",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contactConsents.id, input.consentId),
            eq(contactConsents.orgId, input.orgId),
            isNull(contactConsents.revokedAt),
          ),
        );

      return { ok: true };
    }),

  // -------------------------------------------------------------------------
  // contactComplianceStatus — get compliance status for a contact
  // -------------------------------------------------------------------------
  contactComplianceStatus: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      return getContactComplianceStatus(input);
    }),
});
