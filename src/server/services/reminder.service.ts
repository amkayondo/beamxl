import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { invoices, messageLogs, messageTemplates } from "@/server/db/schema";
import { sendConversationMessage } from "@/server/services/conversation.service";

const fallbackTemplates: Record<string, string> = {
  FRIENDLY_REMINDER:
    "Hi {{name}}, a reminder that {{amount}} for {{period}} is due on {{dueDate}}. Pay here: {{payLink}}",
  DUE_TODAY:
    "Hi {{name}}, your payment of {{amount}} is due today. Pay here: {{payLink}}",
  LATE_NOTICE:
    "Hi {{name}}, your payment is overdue by 1 day. Please pay here: {{payLink}}",
  FINAL_NOTICE:
    "Hi {{name}}, final reminder for {{amount}}. Please settle here: {{payLink}}",
  RECEIPT_CONFIRMATION:
    "Hi {{name}}, we received your payment of {{amount}}. Thank you.",
};

function formatAmount(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function renderTemplate(body: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), body);
}

export async function sendReminderForInvoice(input: {
  orgId: string;
  invoiceId: string;
  templateKey: keyof typeof fallbackTemplates;
}) {
  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) => and(eq(i.id, input.invoiceId), eq(i.orgId, input.orgId)),
    with: {
      contact: true,
    },
  });

  if (!invoice) throw new Error("Invoice not found");

  if (invoice.status === "PAID" || invoice.status === "CANCELED" || invoice.status === "FAILED") {
    return { skipped: true as const, reason: "Invoice not actionable" };
  }

  if (invoice.contact.optedOutAt) {
    return { skipped: true as const, reason: "Contact opted out" };
  }

  const tpl = await db.query.messageTemplates.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.orgId, input.orgId),
        eq(t.key, input.templateKey),
        eq(t.isActive, true)
      ),
    orderBy: (t, { desc }) => [desc(t.version)],
  });

  const messageBody = renderTemplate(
    tpl?.body ?? fallbackTemplates[input.templateKey],
    {
      name: invoice.contact.name,
      amount: formatAmount(invoice.amountDueMinor, invoice.currency),
      period: `${invoice.periodStart} - ${invoice.periodEnd}`,
      dueDate: invoice.dueDate,
      payLink: invoice.payLinkUrl ?? "",
    }
  );

  const result = await sendConversationMessage({
    orgId: input.orgId,
    contactId: invoice.contactId,
    invoiceId: invoice.id,
    body: `${messageBody}\n\nReply STOP to opt out.`,
  });

  await db
    .update(invoices)
    .set({
      lastReminderAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, invoice.orgId)));

  return {
    skipped: false as const,
    ...result,
  };
}

export async function sendReceiptConfirmation(input: { orgId: string; invoiceId: string }) {
  return sendReminderForInvoice({
    orgId: input.orgId,
    invoiceId: input.invoiceId,
    templateKey: "RECEIPT_CONFIRMATION",
  });
}

export async function handleDeliveryStatus(input: {
  orgId: string;
  providerMessageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
}) {
  const log = await db.query.messageLogs.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.orgId, input.orgId), eq(m.providerMessageId, input.providerMessageId)),
  });

  if (!log) return;

  await db
    .update(messageLogs)
    .set({
      deliveryStatus: input.status,
      deliveredAt: input.status === "DELIVERED" ? new Date() : log.deliveredAt,
      readAt: input.status === "READ" ? new Date() : log.readAt,
      updatedAt: new Date(),
    })
    .where(and(eq(messageLogs.id, log.id), eq(messageLogs.orgId, input.orgId)));
}
