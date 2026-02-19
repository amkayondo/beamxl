import { NextResponse } from "next/server";

import { env } from "@/env";
import { createCheckoutForInvoice } from "@/server/services/payment.service";
import { db } from "@/server/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Invalid payment link" },
      { status: 403 }
    );
  }

  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.id, invoiceId), eq(i.publicPayToken, token)),
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Invalid payment link" },
      { status: 403 }
    );
  }

  if (invoice.status === "PAID") {
    return NextResponse.json(
      { error: "Invoice already paid" },
      { status: 400 }
    );
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnUrl = `${baseUrl}/pay/i/${invoice.id}?token=${invoice.publicPayToken}`;

  const checkout = await createCheckoutForInvoice({
    orgId: invoice.orgId,
    invoiceId: invoice.id,
    returnUrl,
  });

  return NextResponse.json({
    checkoutUrl: checkout.checkoutUrl,
    providerIntentId: checkout.providerIntentId,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Invalid payment link" },
      { status: 403 }
    );
  }

  const invoice = await db.query.invoices.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.id, invoiceId), eq(i.publicPayToken, token)),
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Invalid payment link" },
      { status: 403 }
    );
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnUrl = `${baseUrl}/pay/i/${invoice.id}?token=${invoice.publicPayToken}`;

  const checkout = await createCheckoutForInvoice({
    orgId: invoice.orgId,
    invoiceId: invoice.id,
    returnUrl,
  });

  return NextResponse.redirect(checkout.checkoutUrl);
}
