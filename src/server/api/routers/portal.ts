import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, orgProcedure } from "@/server/api/trpc";
import {
  clientPortalAccounts,
  clientPortalSessions,
  disputes,
  paymentPlanRequests,
  portalPreferences,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";

export const portalRouter = createTRPCRouter({
  listAccounts: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.clientPortalAccounts.findMany({
        where: (a, { eq }) => eq(a.orgId, input.orgId),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });
    }),

  createOrActivateAccount: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.clientPortalAccounts.findFirst({
        where: (a, { and, eq }) =>
          and(eq(a.orgId, input.orgId), eq(a.contactId, input.contactId)),
      });

      if (existing) {
        await ctx.db
          .update(clientPortalAccounts)
          .set({
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(clientPortalAccounts.id, existing.id));

        return { accountId: existing.id };
      }

      const accountId = crypto.randomUUID();
      await ctx.db.insert(clientPortalAccounts).values({
        id: accountId,
        orgId: input.orgId,
        contactId: input.contactId,
        isActive: true,
      });

      return { accountId };
    }),

  updatePreferences: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        allowSms: z.boolean().optional(),
        allowEmail: z.boolean().optional(),
        allowWhatsapp: z.boolean().optional(),
        allowVoice: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.portalPreferences.findFirst({
        where: (p, { and, eq }) =>
          and(eq(p.orgId, input.orgId), eq(p.contactId, input.contactId)),
      });

      if (existing) {
        await ctx.db
          .update(portalPreferences)
          .set({
            allowSms: input.allowSms ?? existing.allowSms,
            allowEmail: input.allowEmail ?? existing.allowEmail,
            allowWhatsapp: input.allowWhatsapp ?? existing.allowWhatsapp,
            allowVoice: input.allowVoice ?? existing.allowVoice,
            updatedAt: new Date(),
          })
          .where(eq(portalPreferences.id, existing.id));
      } else {
        await ctx.db.insert(portalPreferences).values({
          orgId: input.orgId,
          contactId: input.contactId,
          allowSms: input.allowSms ?? true,
          allowEmail: input.allowEmail ?? true,
          allowWhatsapp: input.allowWhatsapp ?? true,
          allowVoice: input.allowVoice ?? true,
        });
      }

      return { ok: true };
    }),

  submitDispute: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        contactId: z.string().min(1),
        reason: z.string().min(2),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const disputeId = crypto.randomUUID();
      await ctx.db.insert(disputes).values({
        id: disputeId,
        orgId: input.orgId,
        invoiceId: input.invoiceId,
        contactId: input.contactId,
        reason: input.reason,
        details: input.details ?? null,
        status: "OPEN",
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "PORTAL_DISPUTE_SUBMITTED",
        entityType: "Dispute",
        entityId: disputeId,
        after: input,
      });

      return { disputeId };
    }),

  requestPaymentPlan: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        invoiceId: z.string().min(1),
        requestedAmountMinor: z.number().int().optional(),
        requestedInstallments: z.number().int().optional(),
        preferredDayOfMonth: z.number().int().min(1).max(31).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const requestId = crypto.randomUUID();
      await ctx.db.insert(paymentPlanRequests).values({
        id: requestId,
        orgId: input.orgId,
        contactId: input.contactId,
        invoiceId: input.invoiceId,
        requestedAmountMinor: input.requestedAmountMinor,
        requestedInstallments: input.requestedInstallments,
        preferredDayOfMonth: input.preferredDayOfMonth,
        notes: input.notes ?? null,
      });

      return { requestId };
    }),

  sessionsByAccount: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        portalAccountId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.clientPortalSessions.findMany({
        where: (s, { and, eq }) =>
          and(eq(s.orgId, input.orgId), eq(s.portalAccountId, input.portalAccountId)),
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }),
});
