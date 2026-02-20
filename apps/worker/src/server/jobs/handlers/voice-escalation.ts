import { birdCallAdapter } from "@/server/adapters/calls/bird.adapter";
import { db } from "@/server/db";
import { callLogs } from "@/server/db/schema";

export async function handleVoiceEscalationJob(payload: {
  orgId: string;
  invoiceId: string;
}) {
  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.orgId, payload.orgId), eq(i.id, payload.invoiceId)),
    with: {
      contact: true,
    },
  });

  if (!invoice) {
    return { skipped: true, reason: "Invoice not found" };
  }

  if (!invoice.contact.phoneE164) {
    return { skipped: true, reason: "Contact has no phone number" };
  }

  const amount = (invoice.amountDueMinor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: invoice.currency,
  });

  const call = await birdCallAdapter.placeCall({
    toE164: invoice.contact.phoneE164,
    scriptText: `Hello ${invoice.contact.name}. This is a reminder that invoice ${invoice.invoiceNumber} with balance ${amount} is due. Please use your payment link to settle this invoice.`,
    metadata: {
      orgId: payload.orgId,
      invoiceId: payload.invoiceId,
      contactId: invoice.contactId,
    },
  });

  await db.insert(callLogs).values({
    orgId: payload.orgId,
    contactId: invoice.contactId,
    invoiceId: invoice.id,
    provider: birdCallAdapter.provider,
    providerCallId: call.providerCallId,
    status: "QUEUED",
  });

  return {
    skipped: false,
    provider: birdCallAdapter.provider,
    providerCallId: call.providerCallId,
  };
}
