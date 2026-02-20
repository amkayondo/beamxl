export type ExtensionCaptureDraft = {
  clientName?: string;
  clientEmail?: string;
  clientPhoneE164?: string;
  invoiceNumber?: string;
  amountDueMinor?: number;
  dueDate?: string;
  currency?: string;
  notes?: string;
};

export function parseMoneyMinor(source: string) {
  const match = source.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
  const rawAmount = match?.[1];
  if (!rawAmount) return undefined;

  const normalized = rawAmount.replaceAll(",", "");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return undefined;

  return Math.round(value * 100);
}

export function parseDueDate(source: string) {
  const match = source.match(
    /(?:due|payment due|due date)[:\s]+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  const rawDate = match?.[1];
  if (!rawDate) return undefined;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function firstRegex(source: string, regex: RegExp) {
  const match = source.match(regex);
  return match?.[0];
}

function firstPhoneCandidate(source: string) {
  const matches = source.match(/\+?[0-9][0-9()\-\s]{8,}[0-9]/g) ?? [];
  return matches.find((candidate) => {
    const digits = candidate.replaceAll(/[^0-9]/g, "");
    return digits.length >= 10;
  });
}

export function buildCaptureDraft(input: {
  title: string;
  selectedText?: string;
  bodyText?: string;
  location: string;
}) {
  const selectedText = input.selectedText ?? "";
  const bodyText = input.bodyText ?? "";
  const source = `${input.title}\n${selectedText}\n${bodyText}`;

  const email = firstRegex(source, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = firstPhoneCandidate(source);

  const draft: ExtensionCaptureDraft = {
    clientName: input.title.split("|")[0]?.trim() || undefined,
    clientEmail: email,
    clientPhoneE164: phone?.replaceAll(/[^0-9+]/g, "") || undefined,
    amountDueMinor: parseMoneyMinor(source),
    dueDate: parseDueDate(source),
    currency: "USD",
    notes: selectedText.slice(0, 500),
  };

  return {
    draft,
    rawPayload: {
      title: input.title,
      location: input.location,
      selectedText,
      capturedAt: new Date().toISOString(),
    },
  };
}
