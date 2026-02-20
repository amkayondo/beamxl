import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { disputes, invoices, paymentPlanRequests, portalPreferences } from "@/server/db/schema";
import { resolvePortalAccountByToken } from "@/server/services/portal-auth.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const account = await resolvePortalAccountByToken(token);

  if (!account) {
    return NextResponse.json({ error: "Invalid portal token" }, { status: 401 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");

  if (action === "dispute") {
    const invoiceId = String(formData.get("invoiceId") ?? "");
    const details = String(formData.get("details") ?? "");

    if (!invoiceId || !details) {
      return NextResponse.json({ error: "Missing dispute fields" }, { status: 400 });
    }

    await db.insert(disputes).values({
      id: crypto.randomUUID(),
      orgId: account.orgId,
      invoiceId,
      contactId: account.contactId,
      reason: "Submitted from portal",
      details,
      status: "OPEN",
    });

    await db
      .update(invoices)
      .set({ status: "IN_DISPUTE", updatedAt: new Date() })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, account.orgId)));

    return NextResponse.redirect(new URL(`/portal/${encodeURIComponent(token)}?submitted=dispute`, request.url));
  }

  if (action === "payment-plan") {
    const invoiceId = String(formData.get("invoiceId") ?? "");
    const notes = String(formData.get("notes") ?? "");

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    await db.insert(paymentPlanRequests).values({
      id: crypto.randomUUID(),
      orgId: account.orgId,
      contactId: account.contactId,
      invoiceId,
      notes: notes || null,
      status: "PENDING",
    });

    return NextResponse.redirect(new URL(`/portal/${encodeURIComponent(token)}?submitted=payment-plan`, request.url));
  }

  if (action === "preferences") {
    const allowSms = formData.get("allowSms") === "on";
    const allowEmail = formData.get("allowEmail") === "on";
    const allowWhatsapp = formData.get("allowWhatsapp") === "on";
    const allowVoice = formData.get("allowVoice") === "on";

    const existing = await db.query.portalPreferences.findFirst({
      where: (p, { and, eq }) =>
        and(eq(p.orgId, account.orgId), eq(p.contactId, account.contactId)),
    });

    if (existing) {
      await db
        .update(portalPreferences)
        .set({
          allowSms,
          allowEmail,
          allowWhatsapp,
          allowVoice,
          updatedAt: new Date(),
        })
        .where(eq(portalPreferences.id, existing.id));
    } else {
      await db.insert(portalPreferences).values({
        id: crypto.randomUUID(),
        orgId: account.orgId,
        contactId: account.contactId,
        allowSms,
        allowEmail,
        allowWhatsapp,
        allowVoice,
      });
    }

    return NextResponse.redirect(new URL(`/portal/${encodeURIComponent(token)}?submitted=preferences`, request.url));
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
