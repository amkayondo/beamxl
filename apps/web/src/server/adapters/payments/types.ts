export type PaymentProvider = "STRIPE";

export type PaymentWebhookEvent = {
  providerEventId: string;
  type: "PAYMENT_SUCCEEDED" | "PAYMENT_FAILED" | "PAYMENT_PENDING";
  providerPaymentId?: string;
  providerIntentId?: string;
  invoiceId?: string;
  amountMinor?: number;
  currency?: string;
  raw: unknown;
};

export interface PaymentAdapter {
  provider: PaymentProvider;
  createCheckoutSession(input: {
    invoiceId: string;
    amountMinor: number;
    currency: string;
    payerPhone?: string;
    returnUrl: string;
  }): Promise<{
    checkoutUrl: string;
    providerIntentId: string;
    expiresAt?: Date;
  }>;
  verifyWebhook(input: {
    rawBody: string;
    signature: string;
    headers: Headers;
  }): Promise<boolean>;
  parseWebhook(input: { rawBody: string; headers: Headers }): Promise<PaymentWebhookEvent>;
}
