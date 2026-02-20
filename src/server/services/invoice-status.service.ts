const legacyToCanonicalStatus = {
  CANCELED: "CANCELLED",
} as const;

const canonicalToLegacyStatus = {
  CANCELLED: "CANCELED",
} as const;

export type InvoiceStatusInput =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "DUE"
  | "OVERDUE"
  | "PARTIAL"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "CANCELLED"
  | "WRITTEN_OFF"
  | "IN_DISPUTE";

export function toCanonicalInvoiceStatus(status: InvoiceStatusInput) {
  return (
    legacyToCanonicalStatus[status as keyof typeof legacyToCanonicalStatus] ?? status
  ) as Exclude<InvoiceStatusInput, "CANCELED">;
}

export function toStoredInvoiceStatus(status: InvoiceStatusInput) {
  return (
    canonicalToLegacyStatus[status as keyof typeof canonicalToLegacyStatus] ?? status
  ) as Exclude<InvoiceStatusInput, "CANCELLED">;
}
