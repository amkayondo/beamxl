import type { invoices } from "@/server/db/schema";

export type InvoiceHealthLabel = "HEALTHY" | "AT_RISK" | "CRITICAL";

export type InvoiceHealth = {
  score: number;
  health: InvoiceHealthLabel;
  overdueDays: number;
  outstandingMinor: number;
};

type InvoiceForHealth = Pick<
  typeof invoices.$inferSelect,
  | "status"
  | "dueDate"
  | "amountDueMinor"
  | "amountPaidMinor"
  | "discountAppliedMinor"
  | "lastReminderAt"
>;

function clamp(input: number, min: number, max: number) {
  return Math.max(min, Math.min(max, input));
}

function deriveHealthLabel(score: number): InvoiceHealthLabel {
  if (score >= 70) return "HEALTHY";
  if (score >= 40) return "AT_RISK";
  return "CRITICAL";
}

function startOfUtcDay(input: Date) {
  return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
}

export function computeInvoiceHealth(invoice: InvoiceForHealth, now = new Date()): InvoiceHealth {
  const outstandingMinor = Math.max(
    invoice.amountDueMinor - invoice.amountPaidMinor - invoice.discountAppliedMinor,
    0,
  );

  if (invoice.status === "PAID") {
    return {
      score: 100,
      health: "HEALTHY",
      overdueDays: 0,
      outstandingMinor,
    };
  }

  if (
    invoice.status === "WRITTEN_OFF" ||
    invoice.status === "IN_DISPUTE" ||
    invoice.status === "CANCELED" ||
    invoice.status === "CANCELLED"
  ) {
    return {
      score: 10,
      health: "CRITICAL",
      overdueDays: 0,
      outstandingMinor,
    };
  }

  const dueDay = startOfUtcDay(invoice.dueDate);
  const nowDay = startOfUtcDay(now);
  const dayDelta = Math.floor((nowDay - dueDay) / 86_400_000);
  const overdueDays = Math.max(dayDelta, 0);

  let score = 100;

  if (overdueDays > 30) {
    score -= 65;
  } else if (overdueDays > 7) {
    score -= 45;
  } else if (overdueDays > 0) {
    score -= 25;
  }

  if (dayDelta < 0 && Math.abs(dayDelta) <= 3) {
    score -= 10;
  } else if (dayDelta < -7) {
    score += 5;
  }

  if (invoice.amountPaidMinor > 0 && outstandingMinor > 0) {
    score += 10;
  }

  if (invoice.lastReminderAt) {
    const reminderAgeDays = Math.floor((nowDay - startOfUtcDay(invoice.lastReminderAt)) / 86_400_000);
    if (reminderAgeDays <= 3) {
      score += 5;
    }
  }

  score = clamp(score, 0, 100);

  return {
    score,
    health: deriveHealthLabel(score),
    overdueDays,
    outstandingMinor,
  };
}
