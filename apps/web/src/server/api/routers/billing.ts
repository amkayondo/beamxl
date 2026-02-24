import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, orgProcedure } from "@/server/api/trpc";
import {
  creditTopups,
  orgIntegrations,
  orgs,
  overageCaps,
  planCatalog,
  trialState,
  usageCredits,
} from "@/server/db/schema";
import {
  createPlatformTopupCheckoutSession,
  createPlatformSubscriptionCheckoutSession,
  requireStripeClient,
  requireStripeSubscriptionPriceId,
} from "@/server/stripe";
import { writeAuditLog } from "@/server/services/audit.service";
import { settleTopupFromCheckoutSession } from "@/server/services/billing-topup.service";
import { resolveOrgPlanAllocation } from "@/server/services/plan-allocation.service";
import { getTopupPack, TOPUP_PACKS } from "@/server/services/topup-packs";

export const billingRouter = createTRPCRouter({
  catalog: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .query(async ({ ctx }) => {
      return ctx.db.query.planCatalog.findMany({
        where: (p, { eq }) => eq(p.isActive, true),
        orderBy: (p, { asc }) => [asc(p.monthlyPriceMinor)],
      });
    }),

  listTopupPacks: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .query(async () => {
      return TOPUP_PACKS;
    }),

  getState: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const [org, stripeIntegration] = await Promise.all([
        ctx.db.query.orgs.findFirst({
          where: (o, { eq }) => eq(o.id, input.orgId),
        }),
        ctx.db.query.orgIntegrations.findFirst({
          where: (i, { and, eq }) =>
            and(eq(i.orgId, input.orgId), eq(i.provider, "stripe")),
        }),
      ]);

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      return {
        connect: {
          status: stripeIntegration?.status ?? "disconnected",
          stripeAccountId: stripeIntegration?.stripeAccountId ?? null,
        },
        subscription: {
          stripeCustomerId: org.stripeCustomerId ?? null,
          stripeSubscriptionId: org.stripeSubscriptionId ?? null,
          stripeSubscriptionStatus: org.stripeSubscriptionStatus ?? null,
          stripePriceId: org.stripePriceId ?? null,
          stripeCurrentPeriodEnd: org.stripeCurrentPeriodEnd,
          stripeSubscriptionUpdatedAt: org.stripeSubscriptionUpdatedAt,
        },
      };
    }),

  usageMeter: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
      const allocation = await resolveOrgPlanAllocation(input.orgId);

      const existing = await ctx.db.query.usageCredits.findFirst({
        where: (u, { and, eq }) => and(eq(u.orgId, input.orgId), eq(u.cycleStart, cycleStart)),
      });

      if (existing) {
        const missingBaseAllocation =
          existing.smsIncluded === 0 &&
          existing.emailIncluded === 0 &&
          existing.voiceSecondsIncluded === 0 &&
          existing.whatsappIncluded === 0;

        if (missingBaseAllocation) {
          await ctx.db
            .update(usageCredits)
            .set({
              smsIncluded: allocation.smsIncluded,
              emailIncluded: allocation.emailIncluded,
              voiceSecondsIncluded: allocation.voiceSecondsIncluded,
              whatsappIncluded: allocation.whatsappIncluded,
              updatedAt: new Date(),
            })
            .where(eq(usageCredits.id, existing.id));

          const patched = await ctx.db.query.usageCredits.findFirst({
            where: (u, { eq }) => eq(u.id, existing.id),
          });
          return patched ?? existing;
        }

        return existing;
      }

      const insertedId = crypto.randomUUID();
      await ctx.db.insert(usageCredits).values({
        id: insertedId,
        orgId: input.orgId,
        cycleStart,
        cycleEnd,
        smsIncluded: allocation.smsIncluded,
        emailIncluded: allocation.emailIncluded,
        voiceSecondsIncluded: allocation.voiceSecondsIncluded,
        whatsappIncluded: allocation.whatsappIncluded,
      });

      const inserted = await ctx.db.query.usageCredits.findFirst({
        where: (u, { eq }) => eq(u.id, insertedId),
      });

      if (!inserted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to initialize usage meter",
        });
      }

      return inserted;
    }),

  trialState: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.query.trialState.findFirst({
        where: (t, { eq }) => eq(t.orgId, input.orgId),
      });

      if (existing) {
        if (existing.status === "ACTIVE" && existing.endsAt <= new Date()) {
          await ctx.db
            .update(trialState)
            .set({
              status: "EXPIRED",
              updatedAt: new Date(),
            })
            .where(eq(trialState.id, existing.id));

          return ctx.db.query.trialState.findFirst({
            where: (t, { eq }) => eq(t.id, existing.id),
          });
        }
        return existing;
      }

      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setDate(endsAt.getDate() + 14);

      const id = crypto.randomUUID();
      await ctx.db.insert(trialState).values({
        id,
        orgId: input.orgId,
        status: "ACTIVE",
        startsAt: now,
        endsAt,
        requiresCardAt: endsAt,
      });

      return ctx.db.query.trialState.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });
    }),

  setOveragePolicy: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        mode: z.enum(["HARD_STOP", "CONTINUE_AND_BILL"]),
        capMinor: z.number().int().min(0),
        threshold10Enabled: z.boolean().default(true),
        threshold25Enabled: z.boolean().default(true),
        threshold50Enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.overageCaps.findFirst({
        where: (o, { eq }) => eq(o.orgId, input.orgId),
      });

      if (existing) {
        await ctx.db
          .update(overageCaps)
          .set({
            mode: input.mode,
            capMinor: input.capMinor,
            threshold10Enabled: input.threshold10Enabled,
            threshold25Enabled: input.threshold25Enabled,
            threshold50Enabled: input.threshold50Enabled,
            updatedAt: new Date(),
          })
          .where(eq(overageCaps.id, existing.id));
      } else {
        await ctx.db.insert(overageCaps).values({
          orgId: input.orgId,
          mode: input.mode,
          capMinor: input.capMinor,
          threshold10Enabled: input.threshold10Enabled,
          threshold25Enabled: input.threshold25Enabled,
          threshold50Enabled: input.threshold50Enabled,
        });
      }

      const now = new Date();
      const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const usage = await ctx.db.query.usageCredits.findFirst({
        where: (u, { and, eq }) => and(eq(u.orgId, input.orgId), eq(u.cycleStart, cycleStart)),
      });

      if (usage) {
        await ctx.db
          .update(usageCredits)
          .set({
            overageMode: input.mode,
            overageCapMinor: input.capMinor,
            updatedAt: new Date(),
          })
          .where(eq(usageCredits.id, usage.id));
      }

      return { ok: true };
    }),

  createTopupCheckout: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        packCode: z.enum(["MINI", "BUSINESS", "POWER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pack = getTopupPack(input.packCode);
      if (!pack) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid packCode ${input.packCode}`,
        });
      }

      const org = await ctx.db.query.orgs.findFirst({
        where: (o, { eq }) => eq(o.id, input.orgId),
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      const stripe = requireStripeClient();
      let customerId = org.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: org.name,
          metadata: { orgId: org.id },
        });
        customerId = customer.id;

        await ctx.db
          .update(orgs)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionUpdatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orgs.id, org.id));
      }

      const id = crypto.randomUUID();
      await ctx.db.insert(creditTopups).values({
        id,
        orgId: input.orgId,
        packCode: pack.code,
        smsCredits: pack.smsCredits,
        emailCredits: pack.emailCredits,
        voiceSeconds: pack.voiceSeconds,
        whatsappCredits: pack.whatsappCredits,
        priceMinor: pack.priceMinor,
        currency: pack.currency,
        status: "PENDING",
      });

      const session = await createPlatformTopupCheckoutSession({
        orgId: org.id,
        orgSlug: org.slug,
        customerId,
        topupId: id,
        packCode: pack.code,
        priceMinor: pack.priceMinor,
        currency: pack.currency,
        smsCredits: pack.smsCredits,
        emailCredits: pack.emailCredits,
        voiceSeconds: pack.voiceSeconds,
        whatsappCredits: pack.whatsappCredits,
      });

      await writeAuditLog({
        orgId: org.id,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "TOPUP_CHECKOUT_CREATED",
        entityType: "CreditTopup",
        entityId: id,
        after: {
          packCode: pack.code,
          priceMinor: pack.priceMinor,
          checkoutSessionId: session.id,
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a top-up checkout URL",
        });
      }

      return {
        topupId: id,
        url: session.url,
      };
    }),

  // Backward-compatible admin/manual credit grants.
  addTopup: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        packCode: z.string().min(1),
        smsCredits: z.number().int().min(0).default(0),
        emailCredits: z.number().int().min(0).default(0),
        voiceSeconds: z.number().int().min(0).default(0),
        whatsappCredits: z.number().int().min(0).default(0),
        priceMinor: z.number().int().min(0).default(0),
        currency: z.string().default("USD"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const topupId = crypto.randomUUID();
      await ctx.db.insert(creditTopups).values({
        id: topupId,
        orgId: input.orgId,
        packCode: input.packCode.toUpperCase(),
        smsCredits: input.smsCredits,
        emailCredits: input.emailCredits,
        voiceSeconds: input.voiceSeconds,
        whatsappCredits: input.whatsappCredits,
        priceMinor: input.priceMinor,
        currency: input.currency,
        status: "PENDING",
      });

      await settleTopupFromCheckoutSession({
        orgId: input.orgId,
        topupId,
      });

      return { topupId };
    }),

  disconnectConnectAccount: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.orgIntegrations.findFirst({
        where: (i, { and, eq }) =>
          and(eq(i.orgId, input.orgId), eq(i.provider, "stripe")),
      });

      if (existing) {
        await ctx.db
          .update(orgIntegrations)
          .set({
            status: "disconnected",
            stripeAccountId: null,
            stripePublishableKey: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(orgIntegrations.orgId, input.orgId),
              eq(orgIntegrations.provider, "stripe")
            )
          );
      } else {
        await ctx.db.insert(orgIntegrations).values({
          orgId: input.orgId,
          provider: "stripe",
          status: "disconnected",
          stripeAccountId: null,
          stripePublishableKey: null,
        });
      }

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "STRIPE_CONNECT_DISCONNECTED",
        entityType: "OrgIntegration",
        entityId: existing?.id ?? input.orgId,
      });

      return { ok: true };
    }),

  createSubscriptionCheckout: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const priceId = (() => {
        try {
          return requireStripeSubscriptionPriceId();
        } catch (error) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "STRIPE_SUBSCRIPTION_PRICE_ID is not configured",
          });
        }
      })();

      const org = await ctx.db.query.orgs.findFirst({
        where: (o, { eq }) => eq(o.id, input.orgId),
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      const stripe = requireStripeClient();
      let customerId = org.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: org.name,
          metadata: { orgId: org.id },
        });
        customerId = customer.id;

        await ctx.db
          .update(orgs)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionUpdatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orgs.id, org.id));
      }

      const session = await createPlatformSubscriptionCheckoutSession({
        orgId: org.id,
        orgSlug: org.slug,
        customerId,
        priceId,
      });

      await ctx.db
        .update(orgs)
        .set({
          stripePriceId: priceId,
          stripeSubscriptionUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orgs.id, org.id));

      await writeAuditLog({
        orgId: org.id,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "STRIPE_SUBSCRIPTION_CHECKOUT_CREATED",
        entityType: "Organization",
        entityId: org.id,
        after: {
          checkoutSessionId: session.id,
          customerId,
          priceId,
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a checkout URL",
        });
      }

      return { url: session.url };
    }),
});
