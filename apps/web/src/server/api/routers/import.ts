import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  batchInsertContacts,
  batchInsertInvoices,
  parseCsvString,
  validateContactRows,
  validateInvoiceRows,
} from "@/server/services/csv-import.service";

export const importRouter = createTRPCRouter({
  // ---------- Contacts ----------

  previewContactsCsv: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        csvBase64: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const csvString = Buffer.from(input.csvBase64, "base64").toString("utf-8");
      const rows = parseCsvString(csvString);
      const { valid, errors } = validateContactRows(rows);

      return {
        rawRows: rows,
        valid,
        errors,
        totalRows: rows.length,
      };
    }),

  confirmContactsImport: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contacts: z.array(
          z.object({
            name: z.string().min(1),
            phone: z.string().min(1),
            email: z.string().optional(),
            language: z.enum(["EN", "RW", "LG"]).optional(),
            tags: z.array(z.string()).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await batchInsertContacts(input.orgId, input.contacts);
      return result;
    }),

  // ---------- Invoices ----------

  previewInvoicesCsv: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        csvBase64: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const csvString = Buffer.from(input.csvBase64, "base64").toString("utf-8");
      const rows = parseCsvString(csvString);
      const { valid, errors, warnings } = validateInvoiceRows(rows);

      return {
        rawRows: rows,
        valid,
        errors,
        warnings,
        totalRows: rows.length,
      };
    }),

  confirmInvoicesImport: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoices: z.array(
          z.object({
            contactPhone: z.string(),
            contactName: z.string().optional(),
            invoiceNumber: z.string().min(1),
            amount: z.number().positive(),
            dueDate: z.string().date(),
            currency: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const invoiceRows = input.invoices.map((inv) => ({
        contactPhone: inv.contactPhone,
        contactName: inv.contactName ?? null,
        invoiceNumber: inv.invoiceNumber,
        amountMinor: Math.round(inv.amount * 100),
        dueDate: inv.dueDate,
        currency: inv.currency ?? "USD",
      }));

      const result = await batchInsertInvoices(input.orgId, invoiceRows);
      return result;
    }),
});
