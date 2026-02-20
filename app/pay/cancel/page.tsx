import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PayCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const { invoiceId } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <Card className="w-full border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-700">Payment Canceled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Your payment was canceled before completion.</p>
          {invoiceId ? <p>Invoice ID: {invoiceId}</p> : null}
          <p>You can retry payment from the original invoice link.</p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
