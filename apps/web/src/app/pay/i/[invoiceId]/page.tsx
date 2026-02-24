import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayButton } from "@/components/pay/pay-button";
import { db } from "@/server/db";

function formatCurrency(amountMinor: number, currency: string) {
  return (amountMinor / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
  });
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PublicPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ token?: string; success?: string; canceled?: string }>;
}) {
  const { invoiceId } = await params;
  const { token, success, canceled } = await searchParams;

  const invoice = await db.query.invoices.findFirst({
    where: (i, { eq }) => eq(i.id, invoiceId),
    with: { contact: true },
  });

  /* ── Not found ────────────────────────────────────────────────── */
  if (!invoice) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Invoice Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              The invoice you are looking for does not exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ── Invalid token ────────────────────────────────────────────── */
  if (!token || token !== invoice.publicPayToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <Card className="w-full border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <CardTitle className="text-lg text-red-700">
              Invalid Payment Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              This payment link is invalid or has expired. Please contact the
              sender for a new link.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const formattedAmount = formatCurrency(
    invoice.amountDueMinor,
    invoice.currency,
  );
  const formattedPaid = formatCurrency(
    invoice.amountPaidMinor,
    invoice.currency,
  );
  const contactName = invoice.contact?.name ?? "Customer";

  /* ── Already paid ─────────────────────────────────────────────── */
  if (invoice.status === "PAID") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <Card className="w-full border-green-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <CardTitle className="text-lg text-green-700">
              Payment Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-800">
                {formattedPaid}
              </p>
              <p className="mt-1 text-sm text-green-600">
                Paid on {formatDate(invoice.paidAt)}
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Invoice</span>
                <span className="font-medium text-foreground">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Billed to</span>
                <span className="font-medium text-foreground">
                  {contactName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ── Success redirect (payment processing) ────────────────────── */
  if (success === "1") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <Card className="w-full border-green-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <CardTitle className="text-lg text-green-700">
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-800">
                {formattedAmount}
              </p>
              <p className="mt-1 text-sm text-green-600">
                Your payment is being processed
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              You will receive a confirmation once your payment has been
              completed. This usually takes just a few moments.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Invoice</span>
                <span className="font-medium text-foreground">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Billed to</span>
                <span className="font-medium text-foreground">
                  {contactName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ── Canceled redirect ────────────────────────────────────────── */
  if (canceled === "1") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <Card className="w-full border-yellow-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <CardTitle className="text-lg text-yellow-700">
              Payment Canceled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Your payment was not completed. You can try again whenever you are
              ready.
            </p>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount due</p>
              <p className="text-2xl font-bold">{formattedAmount}</p>
            </div>
            <PayButton invoiceId={invoice.id} token={token} />
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ── Default: show invoice details and pay button ──────────────── */
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Invoice {invoice.invoiceNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Billed to {contactName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount due</p>
            <p className="text-3xl font-bold">{formattedAmount}</p>
            <p className="mt-1 text-xs uppercase text-muted-foreground">
              {invoice.currency}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                className={
                  invoice.status === "OVERDUE"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : invoice.status === "DUE"
                      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                      : "border-border bg-muted text-foreground"
                }
              >
                {invoice.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due date</span>
              <span className="font-medium">{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.amountPaidMinor > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount paid</span>
                <span className="font-medium">{formattedPaid}</span>
              </div>
            )}
          </div>

          <PayButton invoiceId={invoice.id} token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
