import { describe, expect, test } from "bun:test";

import {
  buildCaptureDraft,
  parseDueDate,
  parseMoneyMinor,
} from "../../apps/extension/src/lib/capture-parser";

describe("extension capture parser", () => {
  test("parses currency values into minor units", () => {
    expect(parseMoneyMinor("Invoice total: $1,234.56 due now")).toBe(123456);
    expect(parseMoneyMinor("No money value here")).toBeUndefined();
  });

  test("parses due date phrases", () => {
    const due = parseDueDate("Payment due: 2026-03-14");
    expect(due).toBeTruthy();
    expect(due?.startsWith("2026-03-14")).toBe(true);
  });

  test("buildCaptureDraft extracts contact and amount fields", () => {
    const parsed = buildCaptureDraft({
      title: "Acme Corp Invoice",
      location: "https://mail.google.com/mail/u/0/#inbox",
      selectedText: "Please pay $450.00 by 2026-04-01. Contact finance@acme.com",
      bodyText: "Call +1 (415) 555-0123 for billing questions.",
    });

    expect(parsed.draft.clientEmail).toBe("finance@acme.com");
    expect(parsed.draft.clientPhoneE164).toBe("+14155550123");
    expect(parsed.draft.amountDueMinor).toBe(45000);
    expect(parsed.rawPayload.location).toBe("https://mail.google.com/mail/u/0/#inbox");
  });
});
