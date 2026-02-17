import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { invoices, webhookEvents } from "@/server/db/schema";
import { stripePaymentAdapter } from "@/server/adapters/payments/stripe.adapter";
import { enqueueReceiptJob } from "@/server/jobs/producers";
import { recordPaymentFromWebhook } from "@/server/services/payment.service";
import { writeAuditLog } from "@/server/services/audit.service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  const signatureVerified = await stripePaymentAdapter.verifyWebhook({
    rawBody,
    signature,
    headers: request.headers,
  });

  if (!signatureVerified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = await stripePaymentAdapter.parseWebhook({
    rawBody,
    headers: request.headers,
  });

  try {
    await db.insert(webhookEvents).values({
      provider: "STRIPE",
      providerEventId: event.providerEventId,
      signatureVerified: true,
      status: "RECEIVED",
      payload: event.raw as Record<string, unknown>,
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (event.invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: (i, { eq }) => eq(i.id, event.invoiceId!),
      });

      if (invoice) {
        const mappedStatus =
          event.type === "PAYMENT_SUCCEEDED"
            ? "SUCCEEDED"
            : event.type === "PAYMENT_FAILED"
              ? "FAILED"
              : "PENDING";

        await recordPaymentFromWebhook({
          orgId: invoice.orgId,
          invoiceId: invoice.id,
          provider: "STRIPE",
          providerPaymentId: event.providerPaymentId,
          providerIntentId: event.providerIntentId,
          amountMinor: event.amountMinor,
          currency: event.currency,
          status: mappedStatus,
          rawPayload: event.raw,
        });

        if (mappedStatus === "SUCCEEDED") {
          await enqueueReceiptJob({
            orgId: invoice.orgId,
            invoiceId: invoice.id,
          });
        }

        await writeAuditLog({
          orgId: invoice.orgId,
          actorType: "WEBHOOK",
          action: "PAYMENT_WEBHOOK_PROCESSED",
          entityType: "Invoice",
          entityId: invoice.id,
          after: {
            providerEventId: event.providerEventId,
            status: mappedStatus,
          },
        });

        await db
          .update(webhookEvents)
          .set({
            orgId: invoice.orgId,
            status: "PROCESSED",
            processedAt: new Date(),
          })
          .where(
            and(
              eq(webhookEvents.provider, "STRIPE"),
              eq(webhookEvents.providerEventId, event.providerEventId)
            )
          );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await db
      .update(webhookEvents)
      .set({
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(
        and(
          eq(webhookEvents.provider, "STRIPE"),
          eq(webhookEvents.providerEventId, event.providerEventId)
        )
      );

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
