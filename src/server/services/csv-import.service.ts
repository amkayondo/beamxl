import { parse } from "csv-parse/sync";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { contacts, contactTags, invoices, tags } from "@/server/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidContactRow {
  row: number;
  name: string;
  phone: string;
  email: string | null;
  language: "EN" | "RW" | "LG";
  tags: string[];
}

export interface ValidInvoiceRow {
  row: number;
  contactPhone: string;
  contactName: string | null;
  invoiceNumber: string;
  amountMinor: number; // cents
  dueDate: string; // YYYY-MM-DD
  currency: string;
}

export interface RowError {
  row: number;
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

export function parseCsvString(csvString: string): Record<string, string>[] {
  return parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const PHONE_RE = /^\+\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LANGUAGES = new Set(["EN", "RW", "LG"]);

// ---------------------------------------------------------------------------
// Validate contact rows
// ---------------------------------------------------------------------------

export function validateContactRows(
  rows: Record<string, string>[],
): { valid: ValidContactRow[]; errors: RowError[] } {
  const valid: ValidContactRow[] = [];
  const errors: RowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNum = i + 1; // 1-indexed for human display
    let hasError = false;

    const name = (row.name ?? "").trim();
    const phone = (row.phone ?? "").trim();
    const email = (row.email ?? "").trim() || null;
    const languageRaw = (row.language ?? "").trim().toUpperCase() || "EN";
    const tagsRaw = (row.tags ?? "").trim();

    if (!name) {
      errors.push({ row: rowNum, field: "name", message: "Name is required" });
      hasError = true;
    }

    if (!phone) {
      errors.push({ row: rowNum, field: "phone", message: "Phone is required" });
      hasError = true;
    } else if (!PHONE_RE.test(phone)) {
      errors.push({
        row: rowNum,
        field: "phone",
        message: "Phone must start with + and contain only digits after",
      });
      hasError = true;
    }

    if (email && !EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, field: "email", message: "Invalid email format" });
      hasError = true;
    }

    if (!VALID_LANGUAGES.has(languageRaw)) {
      errors.push({
        row: rowNum,
        field: "language",
        message: `Language must be EN, RW, or LG. Got: ${languageRaw}`,
      });
      hasError = true;
    }

    const tagList = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    if (!hasError) {
      valid.push({
        row: rowNum,
        name,
        phone,
        email,
        language: languageRaw as "EN" | "RW" | "LG",
        tags: tagList,
      });
    }
  }

  return { valid, errors };
}

// ---------------------------------------------------------------------------
// Validate invoice rows
// ---------------------------------------------------------------------------

export function validateInvoiceRows(
  rows: Record<string, string>[],
): { valid: ValidInvoiceRow[]; errors: RowError[]; warnings: string[] } {
  const valid: ValidInvoiceRow[] = [];
  const errors: RowError[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNum = i + 1;
    let hasError = false;

    const contactPhone = (row.contactPhone ?? "").trim();
    const contactName = (row.contactName ?? "").trim() || null;
    const invoiceNumber = (row.invoiceNumber ?? "").trim();
    const amountStr = (row.amount ?? "").trim();
    const dueDate = (row.dueDate ?? "").trim();
    const currency = (row.currency ?? "").trim().toUpperCase() || "USD";

    // At least one of contactPhone or contactName is required
    if (!contactPhone && !contactName) {
      errors.push({
        row: rowNum,
        field: "contactPhone",
        message: "Either contactPhone or contactName is required",
      });
      hasError = true;
    }

    if (contactPhone && !PHONE_RE.test(contactPhone)) {
      errors.push({
        row: rowNum,
        field: "contactPhone",
        message: "Phone must start with + and contain only digits after",
      });
      hasError = true;
    }

    if (!invoiceNumber) {
      errors.push({
        row: rowNum,
        field: "invoiceNumber",
        message: "Invoice number is required",
      });
      hasError = true;
    }

    if (!amountStr) {
      errors.push({
        row: rowNum,
        field: "amount",
        message: "Amount is required",
      });
      hasError = true;
    } else {
      const amountNum = parseFloat(amountStr);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push({
          row: rowNum,
          field: "amount",
          message: "Amount must be a positive number",
        });
        hasError = true;
      }
    }

    if (!dueDate) {
      errors.push({
        row: rowNum,
        field: "dueDate",
        message: "Due date is required",
      });
      hasError = true;
    } else if (!DATE_RE.test(dueDate)) {
      errors.push({
        row: rowNum,
        field: "dueDate",
        message: "Due date must be in YYYY-MM-DD format",
      });
      hasError = true;
    } else {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        errors.push({
          row: rowNum,
          field: "dueDate",
          message: "Due date is not a valid date",
        });
        hasError = true;
      }
    }

    if (!hasError) {
      const amountDollars = parseFloat(amountStr);
      const amountMinor = Math.round(amountDollars * 100);

      if (!contactPhone && contactName) {
        warnings.push(
          `Row ${rowNum}: No phone provided. Will attempt to match contact by name "${contactName}".`,
        );
      }

      valid.push({
        row: rowNum,
        contactPhone,
        contactName,
        invoiceNumber,
        amountMinor,
        dueDate,
        currency,
      });
    }
  }

  return { valid, errors, warnings };
}

// ---------------------------------------------------------------------------
// Batch insert contacts
// ---------------------------------------------------------------------------

export async function batchInsertContacts(
  orgId: string,
  contactRows: Array<{
    name: string;
    phone: string;
    email?: string | null;
    language?: "EN" | "RW" | "LG";
    tags?: string[];
  }>,
): Promise<{ inserted: number; failed: Array<{ row: number; error: string }> }> {
  let inserted = 0;
  const failed: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < contactRows.length; i++) {
    const row = contactRows[i]!;
    const rowNum = i + 1;

    try {
      const contactId = crypto.randomUUID();

      await db.insert(contacts).values({
        id: contactId,
        orgId,
        name: row.name,
        phoneE164: row.phone,
        email: row.email ?? null,
        language: row.language ?? "EN",
      });

      // Handle tags
      if (row.tags && row.tags.length > 0) {
        for (const tagName of row.tags) {
          const trimmedName = tagName.trim();
          if (!trimmedName) continue;

          // Find or create the tag
          let existingTag = await db.query.tags.findFirst({
            where: (t, { and, eq, isNull }) =>
              and(
                eq(t.orgId, orgId),
                eq(t.name, trimmedName),
                isNull(t.deletedAt),
              ),
          });

          if (!existingTag) {
            const newTagId = crypto.randomUUID();
            const insertedTags = await db
              .insert(tags)
              .values({
                id: newTagId,
                orgId,
                name: trimmedName,
              })
              .returning();
            existingTag = insertedTags[0]!;
          }

          // Insert contactTag junction record
          await db.insert(contactTags).values({
            orgId,
            contactId,
            tagId: existingTag.id,
          });
        }
      }

      inserted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      failed.push({ row: rowNum, error: message });
    }
  }

  return { inserted, failed };
}

// ---------------------------------------------------------------------------
// Batch insert invoices
// ---------------------------------------------------------------------------

function buildInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `INV-${stamp}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
}

export async function batchInsertInvoices(
  orgId: string,
  invoiceRows: Array<{
    contactPhone: string;
    contactName?: string | null;
    invoiceNumber: string;
    amountMinor: number;
    dueDate: string;
    currency?: string;
  }>,
): Promise<{ inserted: number; failed: Array<{ row: number; error: string }> }> {
  let inserted = 0;
  const failed: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < invoiceRows.length; i++) {
    const row = invoiceRows[i]!;
    const rowNum = i + 1;

    try {
      // Resolve contact: first by phone, then by name
      let contact: { id: string } | undefined;

      if (row.contactPhone) {
        contact = await db.query.contacts.findFirst({
          where: (c, { and, eq, isNull }) =>
            and(
              eq(c.orgId, orgId),
              eq(c.phoneE164, row.contactPhone),
              isNull(c.deletedAt),
            ),
          columns: { id: true },
        });
      }

      if (!contact && row.contactName) {
        contact = await db.query.contacts.findFirst({
          where: (c, { and, eq, isNull }) =>
            and(
              eq(c.orgId, orgId),
              eq(c.name, row.contactName!),
              isNull(c.deletedAt),
            ),
          columns: { id: true },
        });
      }

      if (!contact) {
        failed.push({
          row: rowNum,
          error: `Contact not found for phone "${row.contactPhone}" or name "${row.contactName ?? ""}"`,
        });
        continue;
      }

      const invoiceId = crypto.randomUUID();
      const payToken = crypto.randomUUID();
      const invNumber = row.invoiceNumber || buildInvoiceNumber();
      const payLinkUrl = `/pay/i/${invoiceId}`;

      await db.insert(invoices).values({
        id: invoiceId,
        orgId,
        contactId: contact.id,
        invoiceNumber: invNumber,
        periodStart: row.dueDate, // default period to dueDate
        periodEnd: row.dueDate,
        dueDate: row.dueDate,
        amountDueMinor: row.amountMinor,
        amountPaidMinor: 0,
        currency: row.currency ?? "USD",
        status: "DRAFT",
        publicPayToken: payToken,
        payLinkUrl,
      });

      inserted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      failed.push({ row: rowNum, error: message });
    }
  }

  return { inserted, failed };
}
