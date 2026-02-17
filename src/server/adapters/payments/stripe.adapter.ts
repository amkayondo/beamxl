import Stripe from "stripe";

import { env } from "@/env";

import type { PaymentAdapter, PaymentWebhookEvent } from "./types";

export class StripePaymentAdapter implements PaymentAdapter {
  provider = "STRIPE" as const;
  private stripe: Stripe | null;

  constructor() {
    this.stripe = env.STRIPE_SECRET_KEY
      ? new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-02-24.acacia",
        })
      : null;
  }

  async createCheckoutSession(input: {
    invoiceId: string;
    amountMinor: number;
    currency: string;
    payerPhone?: string;
    returnUrl: string;
  }) {
    if (!this.stripe) {
      return {
        checkoutUrl: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/i/${input.invoiceId}?mockCheckout=1`,
        providerIntentId: `mock_intent_${input.invoiceId}`,
      };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.returnUrl,
      cancel_url: input.returnUrl,
      metadata: {
        invoiceId: input.invoiceId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: {
              name: `BeamFlow Invoice ${input.invoiceId}`,
            },
          },
        },
      ],
      phone_number_collection: {
        enabled: Boolean(input.payerPhone),
      },
    });

    return {
      checkoutUrl: session.url ?? input.returnUrl,
      providerIntentId: session.payment_intent?.toString() ?? session.id,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
    };
  }

  async verifyWebhook(input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }) {
    if (!this.stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return false;
    }

    try {
      this.stripe.webhooks.constructEvent(
        input.rawBody,
        input.signature,
        env.STRIPE_WEBHOOK_SECRET
      );
      return true;
    } catch {
      return false;
    }
  }

  async parseWebhook(input: { rawBody: string; headers: Headers }) {
    if (this.stripe && env.STRIPE_WEBHOOK_SECRET) {
      const signature = input.headers.get("stripe-signature") ?? "";
      const event = this.stripe.webhooks.constructEvent(
        input.rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      return this.fromStripeEvent(event);
    }

    const json = JSON.parse(input.rawBody) as {
      id: string;
      type: string;
      data?: { object?: Record<string, unknown> };
    };

    return {
      providerEventId: json.id,
      type:
        json.type === "checkout.session.completed"
          ? "PAYMENT_SUCCEEDED"
          : "PAYMENT_PENDING",
      providerPaymentId:
        (json.data?.object?.id as string | undefined) ?? json.id,
      providerIntentId: json.data?.object?.payment_intent as string | undefined,
      invoiceId:
        (json.data?.object as { metadata?: { invoiceId?: string } } | undefined)
          ?.metadata?.invoiceId,
      raw: json,
    } satisfies PaymentWebhookEvent;
  }

  private fromStripeEvent(event: Stripe.Event): PaymentWebhookEvent {
    const object = event.data.object as Stripe.Checkout.Session;
    const invoiceId = object.metadata?.invoiceId;

    if (event.type === "checkout.session.completed") {
      return {
        providerEventId: event.id,
        type: "PAYMENT_SUCCEEDED",
        providerPaymentId: object.id,
        providerIntentId: object.payment_intent?.toString(),
        invoiceId,
        raw: event,
      };
    }

    if (event.type === "checkout.session.expired") {
      return {
        providerEventId: event.id,
        type: "PAYMENT_FAILED",
        providerPaymentId: object.id,
        providerIntentId: object.payment_intent?.toString(),
        invoiceId,
        raw: event,
      };
    }

    return {
      providerEventId: event.id,
      type: "PAYMENT_PENDING",
      providerPaymentId: object.id,
      providerIntentId: object.payment_intent?.toString(),
      invoiceId,
      raw: event,
    };
  }
}

export const stripePaymentAdapter = new StripePaymentAdapter();
