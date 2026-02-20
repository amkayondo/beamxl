import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { createCheckoutForInvoice } from "@/server/services/payment.service";

export const paymentsRouter = createTRPCRouter({
  createCheckout: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        returnUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const checkout = await createCheckoutForInvoice(input);
      return {
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: checkout.expiresAt?.toISOString() ?? new Date(Date.now() + 15 * 60_000).toISOString(),
      };
    }),

  byInvoice: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.payments.findMany({
        where: (p, { and, eq }) =>
          and(eq(p.orgId, input.orgId), eq(p.invoiceId, input.invoiceId)),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
    }),
});
