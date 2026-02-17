import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { env } from "@/env";
import { createCheckoutForInvoice } from "@/server/services/payment.service";
import { db } from "@/server/db";
import { invoices } from "@/server/db/schema";

export async function POST(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await context.params;

  const invoice = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, invoiceId),
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  }

  const checkout = await createCheckoutForInvoice({
    orgId: invoice.orgId,
    invoiceId: invoice.id,
    returnUrl: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/i/${invoice.id}`,
  });

  return NextResponse.json({
    checkoutUrl: checkout.checkoutUrl,
    providerIntentId: checkout.providerIntentId,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await context.params;

  const invoice = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, invoiceId),
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const checkout = await createCheckoutForInvoice({
    orgId: invoice.orgId,
    invoiceId: invoice.id,
    returnUrl: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pay/i/${invoice.id}`,
  });

  return NextResponse.redirect(checkout.checkoutUrl);
}
