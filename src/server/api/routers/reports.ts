import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { invoices } from "@/server/db/schema";

function csvEscape(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export const reportsRouter = createTRPCRouter({
  exportInvoicesCsv: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        dueFrom: z.string().date().optional(),
        dueTo: z.string().date().optional(),
        status: z
          .enum(["DRAFT", "SENT", "DUE", "OVERDUE", "PAID", "FAILED", "CANCELED"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const whereClause = and(
        eq(invoices.orgId, input.orgId),
        input.status ? eq(invoices.status, input.status) : undefined,
        input.dueFrom ? gte(invoices.dueDate, input.dueFrom) : undefined,
        input.dueTo ? lte(invoices.dueDate, input.dueTo) : undefined
      );

      const rows = await ctx.db.query.invoices.findMany({
        where: whereClause,
        with: {
          contact: true,
        },
        orderBy: (i, { desc }) => [desc(i.createdAt)],
      });

      const header = [
        "invoiceId",
        "invoiceNumber",
        "contactName",
        "dueDate",
        "status",
        "amountDueMinor",
        "amountPaidMinor",
        "currency",
      ];

      const lines = rows.map((row) =>
        [
          row.id,
          row.invoiceNumber,
          row.contact?.name,
          row.dueDate,
          row.status,
          row.amountDueMinor,
          row.amountPaidMinor,
          row.currency,
        ]
          .map(csvEscape)
          .join(",")
      );

      const csv = [header.join(","), ...lines].join("\n");
      const encoded = Buffer.from(csv, "utf8").toString("base64");

      return {
        downloadUrl: `data:text/csv;base64,${encoded}`,
      };
    }),
});
