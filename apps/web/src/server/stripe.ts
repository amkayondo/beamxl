import Stripe from "stripe";

import { env } from "@/env";

let stripeClient: Stripe | null = null;
let stripeClientSecret: string | null = null;

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? env.STRIPE_SECRET_KEY ?? null;
}

export function requireStripeClient() {
  const secret = getStripeSecretKey();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient || stripeClientSecret !== secret) {
    stripeClient = new Stripe(secret, {
      apiVersion: "2025-02-24.acacia",
    });
    stripeClientSecret = secret;
  }

  return stripeClient;
}

export function requireStripeConnectClientId() {
  if (!env.STRIPE_CONNECT_CLIENT_ID) {
    throw new Error("STRIPE_CONNECT_CLIENT_ID is not configured");
  }

  return env.STRIPE_CONNECT_CLIENT_ID;
}

export function requireStripeWebhookSecret(kind: "platform" | "connect") {
  const secret =
    kind === "platform"
      ? env.STRIPE_WEBHOOK_SECRET
      : env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      kind === "platform"
        ? "STRIPE_WEBHOOK_SECRET is not configured"
        : "STRIPE_CONNECT_WEBHOOK_SECRET is not configured"
    );
  }

  return secret;
}

export function requireStripeSubscriptionPriceId() {
  if (!env.STRIPE_SUBSCRIPTION_PRICE_ID) {
    throw new Error("STRIPE_SUBSCRIPTION_PRICE_ID is not configured");
  }

  return env.STRIPE_SUBSCRIPTION_PRICE_ID;
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

export async function createPlatformTopupCheckoutSession(input: {
  orgId: string;
  orgSlug: string;
  customerId: string;
  topupId: string;
  packCode: string;
  priceMinor: number;
  currency: string;
  smsCredits: number;
  emailCredits: number;
  voiceSeconds: number;
  whatsappCredits: number;
}) {
  const client = requireStripeClient();
  const appUrl = getAppUrl();

  return client.checkout.sessions.create({
    mode: "payment",
    customer: input.customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.priceMinor,
          product_data: {
            name: `DueFlow ${input.packCode} Credit Top-up`,
          },
        },
      },
    ],
    metadata: {
      orgId: input.orgId,
      topupId: input.topupId,
      packCode: input.packCode,
      smsCredits: String(input.smsCredits),
      emailCredits: String(input.emailCredits),
      voiceSeconds: String(input.voiceSeconds),
      whatsappCredits: String(input.whatsappCredits),
      checkoutType: "TOPUP",
    },
    payment_intent_data: {
      metadata: {
        orgId: input.orgId,
        topupId: input.topupId,
        checkoutType: "TOPUP",
      },
    },
    client_reference_id: input.orgId,
    success_url: `${appUrl}/${input.orgSlug}/settings/billing?topup=success`,
    cancel_url: `${appUrl}/${input.orgSlug}/settings/billing?topup=canceled`,
  });
}
