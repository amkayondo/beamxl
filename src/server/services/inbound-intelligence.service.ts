import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { disputes, invoices, legalRiskFlags, messageLogs } from "@/server/db/schema";
import { createNotification } from "@/server/services/notification.service";

export type InboundIntentTag =
  | "PAID"
  | "DISPUTE"
  | "QUESTION"
  | "EXTENSION_REQUEST"
  | "LEGAL_RISK"
  | "OTHER";

function containsAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

export function classifyInboundIntent(body: string): InboundIntentTag {
  const normalized = body.toLowerCase();

  if (containsAny(normalized, ["already paid", "paid already", "payment sent"])) {
    return "PAID";
  }

  if (containsAny(normalized, ["lawyer", "legal", "sue", "attorney"])) {
    return "LEGAL_RISK";
  }

  if (containsAny(normalized, ["wrong amount", "dispute", "incorrect", "wrong invoice"])) {
    return "DISPUTE";
  }

  if (containsAny(normalized, ["extension", "extra time", "payment plan", "installment"])) {
    return "EXTENSION_REQUEST";
  }

  if (containsAny(normalized, ["?", "question", "can you explain", "help"])) {
    return "QUESTION";
  }

  return "OTHER";
}

async function findMostRelevantInvoice(orgId: string, contactId: string) {
  return db.query.invoices.findFirst({
    where: (i, { and, eq, isNull }) =>
      and(eq(i.orgId, orgId), eq(i.contactId, contactId), isNull(i.deletedAt)),
    orderBy: (i, { desc }) => [desc(i.dueDate), desc(i.createdAt)],
  });
}

export async function processInboundIntent(input: {
  orgId: string;
  contactId: string;
  messageLogId: string;
  body: string;
}) {
  const intent = classifyInboundIntent(input.body);
  const now = new Date();

  await db
    .update(messageLogs)
    .set({
      metadata: {
        intent,
      },
      updatedAt: now,
    })
    .where(and(eq(messageLogs.id, input.messageLogId), eq(messageLogs.orgId, input.orgId)));

  if (intent === "PAID") {
    await createNotification({
      orgId: input.orgId,
      type: "PAYMENT_RECEIVED",
      title: "Contact says invoice is already paid",
      body: "Payment verification required before next reminder.",
      link: "conversations",
      metadata: {
        contactId: input.contactId,
        intent,
      },
    });
    return { intent, escalated: true };
  }

  if (intent === "LEGAL_RISK") {
    const invoice = await findMostRelevantInvoice(input.orgId, input.contactId);

    await db.insert(legalRiskFlags).values({
      id: crypto.randomUUID(),
      orgId: input.orgId,
      invoiceId: invoice?.id ?? null,
      contactId: input.contactId,
      source: "INBOUND_MESSAGE",
      severity: "CRITICAL",
      triggerText: input.body,
      note: "Auto-flagged from inbound message",
      metadata: {
        messageLogId: input.messageLogId,
      },
    });

    await createNotification({
      orgId: input.orgId,
      type: "COMPLIANCE_BLOCKED",
      title: "Legal risk detected",
      body: "Outbound actions should be paused for this contact.",
      link: "conversations",
      metadata: {
        contactId: input.contactId,
        invoiceId: invoice?.id ?? null,
      },
    });

    return { intent, escalated: true };
  }

  if (intent === "DISPUTE") {
    const invoice = await findMostRelevantInvoice(input.orgId, input.contactId);
    if (invoice) {
      await db.insert(disputes).values({
        id: crypto.randomUUID(),
        orgId: input.orgId,
        invoiceId: invoice.id,
        contactId: input.contactId,
        reason: "Auto-detected from inbound message",
        details: input.body,
        status: "OPEN",
      });

      await db
        .update(invoices)
        .set({
          status: "IN_DISPUTE",
          updatedAt: now,
        })
        .where(and(eq(invoices.id, invoice.id), eq(invoices.orgId, input.orgId)));

      await createNotification({
        orgId: input.orgId,
        type: "COMPLIANCE_BLOCKED",
        title: "Dispute opened",
        body: `Invoice ${invoice.invoiceNumber} was moved to In Dispute.`,
        link: "invoices",
        metadata: {
          invoiceId: invoice.id,
          contactId: input.contactId,
        },
      });
    }

    return { intent, escalated: true };
  }

  if (intent === "EXTENSION_REQUEST") {
    await createNotification({
      orgId: input.orgId,
      type: "CONTACT_REPLIED",
      title: "Payment extension requested",
      body: "Contact requested additional time to pay.",
      link: "conversations",
      metadata: {
        contactId: input.contactId,
      },
    });

    return { intent, escalated: true };
  }

  return { intent, escalated: false };
}
