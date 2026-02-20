import Stripe from "stripe";

import { env } from "@/env";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

export function requireStripeClient() {
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return stripe;
}

export function getAppUrl() {
  return env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function createConnectedInvoiceCheckoutSession(input: {
  connectedAccountId: string;
  invoiceId: string;
  orgId: string;
  amountMinor: number;
  currency: string;
  lineItemName: string;
}) {
  const client = requireStripeClient();
  const appUrl = getAppUrl();

  return client.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: {
              name: input.lineItemName,
            },
          },
        },
      ],
      metadata: {
        invoiceId: input.invoiceId,
        orgId: input.orgId,
      },
      payment_intent_data: {
        metadata: {
          invoiceId: input.invoiceId,
          orgId: input.orgId,
        },
      },
      success_url: `${appUrl}/pay/success?invoiceId=${encodeURIComponent(input.invoiceId)}`,
      cancel_url: `${appUrl}/pay/cancel?invoiceId=${encodeURIComponent(input.invoiceId)}`,
    },
    { stripeAccount: input.connectedAccountId }
  );
}

export async function createPlatformSubscriptionCheckoutSession(input: {
  orgId: string;
  orgSlug: string;
  customerId: string;
  priceId: string;
}) {
  const client = requireStripeClient();
  const appUrl = getAppUrl();

  return client.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    metadata: {
      orgId: input.orgId,
    },
    client_reference_id: input.orgId,
    success_url: `${appUrl}/${input.orgSlug}/settings/billing?subscribed=1`,
    cancel_url: `${appUrl}/${input.orgSlug}/settings/billing?canceled=1`,
  });
}
