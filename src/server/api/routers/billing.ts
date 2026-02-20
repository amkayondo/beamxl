import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, adminProcedure, orgProcedure } from "@/server/api/trpc";
import { orgIntegrations, orgs } from "@/server/db/schema";
import {
  createPlatformSubscriptionCheckoutSession,
  requireStripeClient,
} from "@/server/stripe";
import { writeAuditLog } from "@/server/services/audit.service";

export const billingRouter = createTRPCRouter({
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
      if (!env.STRIPE_SUBSCRIPTION_PRICE_ID) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "STRIPE_SUBSCRIPTION_PRICE_ID is not configured",
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

      const session = await createPlatformSubscriptionCheckoutSession({
        orgId: org.id,
        orgSlug: org.slug,
        customerId,
        priceId: env.STRIPE_SUBSCRIPTION_PRICE_ID,
      });

      await ctx.db
        .update(orgs)
        .set({
          stripePriceId: env.STRIPE_SUBSCRIPTION_PRICE_ID,
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
          priceId: env.STRIPE_SUBSCRIPTION_PRICE_ID,
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
