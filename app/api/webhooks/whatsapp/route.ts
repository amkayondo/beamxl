import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { contacts, messageLogs, webhookEvents } from "@/server/db/schema";
import { birdWhatsAppAdapter } from "@/server/adapters/messaging/bird.adapter";
import { recordInboundMessage } from "@/server/services/conversation.service";
import { handleDeliveryStatus } from "@/server/services/reminder.service";
import { revokeAllConsent } from "@/server/services/compliance.service";
import { isStopKeyword, markContactOptedOut } from "@/server/services/optout.service";
import { writeAuditLog } from "@/server/services/audit.service";
import { createNotification } from "@/server/services/notification.service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-signature") ??
    request.headers.get("x-bird-signature") ??
    "";
  const orgId =
    request.headers.get("x-dueflow-org-id") ??
    request.headers.get("x-beamflow-org-id");

  if (!orgId) {
    return NextResponse.json({ error: "Missing org context" }, { status: 400 });
  }

  const verified = await birdWhatsAppAdapter.verifyWebhook({
    rawBody,
    signature,
    headers: request.headers,
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsedEvents = await birdWhatsAppAdapter.parseWebhook({ rawBody });

  for (const event of parsedEvents) {
    try {
      await db.insert(webhookEvents).values({
        provider: "BIRD",
        eventId: `BIRD:${event.providerEventId}`,
        eventType: event.type,
        providerEventId: event.providerEventId,
        orgId,
        accountId: null,
        signatureVerified: true,
        status: "RECEIVED",
        payload: event as unknown as Record<string, unknown>,
      });
    } catch {
      continue;
    }

    if (event.type === "MESSAGE_STATUS") {
      await handleDeliveryStatus({
        orgId,
        providerMessageId: event.providerMessageId,
        status: event.status,
      });

      await db
        .update(webhookEvents)
        .set({
          status: "PROCESSED",
          processedAt: new Date(),
        })
        .where(
          and(
            eq(webhookEvents.provider, "BIRD"),
            eq(webhookEvents.providerEventId, event.providerEventId)
          )
        );
      continue;
    }

    const inbound = await recordInboundMessage({
      orgId,
      fromPhone: event.from,
      body: event.body,
      providerMessageId: event.providerMessageId,
    });

    if (inbound) {
      const contact = await db.query.contacts.findFirst({
        where: (c, { eq }) => eq(c.id, inbound.contactId),
      });

      await createNotification({
        orgId,
        type: "CONTACT_REPLIED",
        title: "New message",
        body: `${contact?.name ?? "Contact"} sent a message`,
        link: `conversations`,
        metadata: { contactId: inbound.contactId },
      });
    }

    if (inbound && (await isStopKeyword(event.body))) {
      await markContactOptedOut({
        orgId,
        contactId: inbound.contactId,
        reason: "STOP",
      });

      await revokeAllConsent({
        orgId,
        contactId: inbound.contactId,
      });

      await writeAuditLog({
        orgId,
        actorType: "SYSTEM",
        action: "OPT_OUT_RECEIVED",
        entityType: "Contact",
        entityId: inbound.contactId,
      });

      await createNotification({
        orgId,
        type: "CONTACT_OPTED_OUT",
        title: "Contact opted out",
        body: `A contact has opted out of communications`,
        link: `contacts`,
        metadata: { contactId: inbound.contactId },
      });
    }

    await db
      .update(webhookEvents)
      .set({
        status: "PROCESSED",
        processedAt: new Date(),
      })
      .where(
        and(
          eq(webhookEvents.provider, "BIRD"),
          eq(webhookEvents.providerEventId, event.providerEventId)
        )
      );
  }

  return NextResponse.json({ ok: true });
}
