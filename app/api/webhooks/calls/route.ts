import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { callLogs, webhookEvents } from "@/server/db/schema";
import { twilioCallAdapter } from "@/server/adapters/calls/twilio.adapter";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const orgId = request.headers.get("x-beamflow-org-id");
  const signature = request.headers.get("x-signature") ?? "";

  if (!orgId) {
    return NextResponse.json({ error: "Missing org context" }, { status: 400 });
  }

  const signatureVerified = await twilioCallAdapter.verifyWebhook({
    rawBody,
    signature,
    headers: request.headers,
  });

  if (!signatureVerified && signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = await twilioCallAdapter.parseWebhook({ rawBody });

  try {
    await db.insert(webhookEvents).values({
      provider: twilioCallAdapter.provider,
      providerEventId: event.providerEventId,
      orgId,
      signatureVerified,
      status: "RECEIVED",
      payload: event.raw as Record<string, unknown>,
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.providerCallId) {
    await db
      .update(callLogs)
      .set({
        status: event.status ?? "COMPLETED",
        outcome: event.outcome,
        transcript: event.transcript,
        summary: event.summary,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(callLogs.orgId, orgId),
          eq(callLogs.providerCallId, event.providerCallId)
        )
      );
  }

  await db
    .update(webhookEvents)
    .set({
      status: "PROCESSED",
      processedAt: new Date(),
    })
    .where(
      and(
        eq(webhookEvents.provider, twilioCallAdapter.provider),
        eq(webhookEvents.providerEventId, event.providerEventId)
      )
    );

  return NextResponse.json({ ok: true });
}
