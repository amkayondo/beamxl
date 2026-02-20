import { beforeAll, describe, expect, it } from "bun:test";

let resolveInvoicePaymentResult: typeof import("@/server/services/invoice.service").resolveInvoicePaymentResult;
let resolveCheckoutAmountPolicy: typeof import("@/server/services/payment.service").resolveCheckoutAmountPolicy;

function baseInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv_1",
    orgId: "org_1",
    contactId: "contact_1",
    paymentPlanId: null,
    recurringScheduleId: null,
    bundleId: null,
    invoiceNumber: "INV-1001",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    dueDate: new Date("2026-02-28T00:00:00.000Z"),
    amountDueMinor: 100_00,
    amountPaidMinor: 0,
    discountAppliedMinor: 0,
    currency: "USD",
    status: "SENT",
    publicPayToken: "token",
    payLinkUrl: "https://example.com",
    paymentLinkExpiresAt: null,
    earlyDiscountPercent: 0,
    earlyDiscountExpiresAt: null,
    allowPartialPayments: false,
    minimumPartialAmountMinor: 0,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    writeOffReason: null,
    writtenOffAt: null,
    lastReminderAt: null,
    paidAt: null,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  } as const;
}

describe("invoice payment policies", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET ??= "invoice-payment-policy-secret";

    const invoiceMod = await import("@/server/services/invoice.service");
    resolveInvoicePaymentResult = invoiceMod.resolveInvoicePaymentResult;

    const paymentMod = await import("@/server/services/payment.service");
    resolveCheckoutAmountPolicy = paymentMod.resolveCheckoutAmountPolicy;
  });

  it("marks invoice as PARTIAL when payment does not settle full balance", () => {
    const result = resolveInvoicePaymentResult({
      invoice: baseInvoice(),
      incomingAmountMinor: 25_00,
      now: new Date("2026-02-15T00:00:00.000Z"),
    });

    expect(result.paidInFull).toBe(false);
    expect(result.status).toBe("PARTIAL");
    expect(result.amountPaidMinor).toBe(25_00);
  });

  it("applies early discount and settles as PAID when discounted total is met", () => {
    const result = resolveInvoicePaymentResult({
      invoice: baseInvoice({
        earlyDiscountPercent: 10,
        earlyDiscountExpiresAt: new Date("2026-02-20T00:00:00.000Z"),
      }),
      incomingAmountMinor: 90_00,
      now: new Date("2026-02-10T00:00:00.000Z"),
    });

    expect(result.paidInFull).toBe(true);
    expect(result.status).toBe("PAID");
    expect(result.discountAppliedMinor).toBe(10_00);
  });

  it("blocks partial checkout when partial payments are disabled", () => {
    expect(() =>
      resolveCheckoutAmountPolicy({
        invoice: baseInvoice({ allowPartialPayments: false }),
        requestedAmountMinor: 20_00,
      })
    ).toThrow("Partial payments are disabled");
  });

  it("blocks checkout when payment link has expired", () => {
    expect(() =>
      resolveCheckoutAmountPolicy({
        invoice: baseInvoice({
          paymentLinkExpiresAt: new Date("2026-02-01T00:00:00.000Z"),
        }),
        now: new Date("2026-03-01T00:00:00.000Z"),
      })
    ).toThrow("Payment link has expired");
  });
});
