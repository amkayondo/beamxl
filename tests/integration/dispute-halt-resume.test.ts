import { beforeAll, describe, expect, it } from "vitest";

let isInvoiceActionableForReminder: typeof import("@/server/services/reminder.service").isInvoiceActionableForReminder;

describe("dispute halt and resume behavior", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5432/dueflow";
    process.env.BETTER_AUTH_SECRET ??= "dispute-halt-resume-secret";

    const mod = await import("@/server/services/reminder.service");
    isInvoiceActionableForReminder = mod.isInvoiceActionableForReminder;
  });

  it("halts reminders while invoice is in dispute", () => {
    expect(isInvoiceActionableForReminder("IN_DISPUTE")).toBe(false);
  });

  it("allows reminders once invoice is returned to active states", () => {
    expect(isInvoiceActionableForReminder("DUE")).toBe(true);
    expect(isInvoiceActionableForReminder("OVERDUE")).toBe(true);
  });
});
