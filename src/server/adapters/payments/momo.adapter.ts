import type { PaymentAdapter } from "./types";

export class MomoPaymentAdapter implements PaymentAdapter {
  provider = "MOMO" as const;

  async createCheckoutSession(input: {
    invoiceId: string;
    amountMinor: number;
    currency: string;
    payerPhone?: string;
    returnUrl: string;
  }) {
    return {
      checkoutUrl: input.returnUrl,
      providerIntentId: `momo_stub_${input.invoiceId}`,
    };
  }

  async verifyWebhook() {
    return false;
  }

  async parseWebhook(input: { rawBody: string }) {
    const payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    return {
      providerEventId: String(payload.id ?? crypto.randomUUID()),
      type: "PAYMENT_PENDING" as const,
      raw: payload,
    };
  }
}

export const momoPaymentAdapter = new MomoPaymentAdapter();
