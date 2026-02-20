import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const { invoiceId } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <Card className="w-full border-green-200">
        <CardHeader>
          <CardTitle className="text-green-700">Payment Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Your payment was submitted and is being confirmed.</p>
          {invoiceId ? <p>Invoice ID: {invoiceId}</p> : null}
          <p>You can close this page safely.</p>
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
