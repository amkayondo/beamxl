import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";

export default async function PublicPayPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, invoiceId),
    with: {
      contact: true,
    },
  });

  if (!invoice) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <p>Invoice not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Pay Invoice {invoice.invoiceNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Contact: {invoice.contact?.name ?? "Customer"}</p>
          <p>Amount Due: {invoice.amountDueMinor}</p>
          <p>Currency: {invoice.currency}</p>
          <p>Due Date: {invoice.dueDate}</p>
          <p>Status: {invoice.status}</p>
          <div className="pt-2">
            <Link href={`/api/pay/${invoice.id}`}>
              <Button type="button" className="w-full">
                Pay now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
