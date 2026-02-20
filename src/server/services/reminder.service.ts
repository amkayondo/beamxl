import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { invoices, messageLogs, messageTemplates } from "@/server/db/schema";
import { checkComplianceForOutbound } from "@/server/services/compliance.service";
import { sendConversationMessage } from "@/server/services/conversation.service";
import {
  renderEmailTemplate,
  getDefaultEmailHtml,
} from "@/server/services/email-template.service";

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

function formatDueDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function renderTemplate(body: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), body);
}

export async function sendReminderForInvoice(input: {
  orgId: string;
  invoiceId: string;
  templateKey: keyof typeof fallbackTemplates;
  channel?: "WHATSAPP" | "EMAIL" | "SMS";
}) {
  const channel = input.channel ?? "WHATSAPP";

  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) => and(eq(i.id, input.invoiceId), eq(i.orgId, input.orgId)),
    with: {
      contact: true,
    },
  });

  if (!invoice) throw new Error("Invoice not found");

  if (
    invoice.status === "PAID" ||
    invoice.status === "CANCELED" ||
    invoice.status === "CANCELLED" ||
    invoice.status === "FAILED" ||
    invoice.status === "WRITTEN_OFF" ||
    invoice.status === "IN_DISPUTE"
  ) {
    return { skipped: true as const, reason: "Invoice not actionable" };
  }

  if (invoice.contact.optedOutAt) {
    return { skipped: true as const, reason: "Contact opted out" };
  }

  // Compliance gate — block if not allowed
  const compliance = await checkComplianceForOutbound({
    orgId: input.orgId,
    contactId: invoice.contactId,
    channel,
  });

  if (!compliance.allowed) {
    return { skipped: true as const, reason: compliance.reason ?? "Blocked by compliance" };
  }

  const templateVars = {
    name: invoice.contact.name,
    amount: formatAmount(invoice.amountDueMinor, invoice.currency),
    period: `${invoice.periodStart} - ${invoice.periodEnd}`,
    dueDate: formatDueDate(invoice.dueDate),
    payLink: invoice.payLinkUrl ?? "",
  };

  if (channel === "EMAIL") {
    // --- Email path ---

    // Try to find an email-specific template first, then fall back to channel-agnostic
    const emailTpl = await db.query.messageTemplates.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.orgId, input.orgId),
          eq(t.key, input.templateKey),
          eq(t.channel, "EMAIL"),
          eq(t.complianceLocked, false),
          inArray(t.approvalStatus, ["APPROVED", "DRAFT"]),
          eq(t.isActive, true),
        ),
      orderBy: (t, { desc }) => [desc(t.version)],
    });

    const fallbackTpl = emailTpl
      ? null
      : await db.query.messageTemplates.findFirst({
          where: (t, { and, eq }) =>
            and(
              eq(t.orgId, input.orgId),
              eq(t.key, input.templateKey),
              eq(t.complianceLocked, false),
              inArray(t.approvalStatus, ["APPROVED", "DRAFT"]),
              eq(t.isActive, true),
            ),
          orderBy: (t, { desc }) => [desc(t.version)],
        });

    const tpl = emailTpl ?? fallbackTpl;

    let emailSubject: string;
    let emailHtml: string;
    let textBody: string;

    if (tpl?.subject && tpl?.htmlBody) {
      // Use the org's custom email template
      const rendered = renderEmailTemplate({
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        variables: templateVars,
      });
      emailSubject = rendered.subject;
      emailHtml = rendered.html;
      textBody = rendered.text;
    } else {
      // Use the built-in default HTML email template
      const defaultEmail = getDefaultEmailHtml(input.templateKey, templateVars);
      emailSubject = defaultEmail.subject;
      emailHtml = defaultEmail.html;
      textBody = defaultEmail.text;
    }

    const result = await sendConversationMessage({
      orgId: input.orgId,
      contactId: invoice.contactId,
      invoiceId: invoice.id,
      body: textBody,
      channel: "EMAIL",
      emailSubject,
      emailHtml,
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

  if (channel === "SMS") {
    const smsTpl = await db.query.messageTemplates.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.orgId, input.orgId),
          eq(t.key, input.templateKey),
          eq(t.channel, "SMS"),
          eq(t.complianceLocked, false),
          inArray(t.approvalStatus, ["APPROVED", "DRAFT"]),
          eq(t.isActive, true)
        ),
      orderBy: (t, { desc }) => [desc(t.version)],
    });

    const messageBody = renderTemplate(
      smsTpl?.body ?? fallbackTemplates[input.templateKey],
      templateVars,
    );

    const result = await sendConversationMessage({
      orgId: input.orgId,
      contactId: invoice.contactId,
      invoiceId: invoice.id,
      body: `${messageBody}\n\nReply STOP to opt out.`,
      channel: "SMS",
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

  // --- WhatsApp path (default) ---
  const tpl = await db.query.messageTemplates.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.orgId, input.orgId),
        eq(t.key, input.templateKey),
        eq(t.complianceLocked, false),
        inArray(t.approvalStatus, ["APPROVED", "DRAFT"]),
        eq(t.isActive, true)
      ),
    orderBy: (t, { desc }) => [desc(t.version)],
  });

  const messageBody = renderTemplate(
    tpl?.body ?? fallbackTemplates[input.templateKey],
    templateVars,
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

export async function sendReceiptConfirmation(input: {
  orgId: string;
  invoiceId: string;
  channel?: "WHATSAPP" | "EMAIL" | "SMS";
}) {
  return sendReminderForInvoice({
    orgId: input.orgId,
    invoiceId: input.invoiceId,
    templateKey: "RECEIPT_CONFIRMATION",
    channel: input.channel,
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
