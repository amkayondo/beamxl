import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatDueDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function healthBadgeClass(health: "HEALTHY" | "AT_RISK" | "CRITICAL") {
  if (health === "HEALTHY") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  if (health === "AT_RISK") return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  return "border-rose-500/40 bg-rose-500/10 text-rose-700";
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; invoiceId: string }>;
}) {
  const { orgSlug, invoiceId } = await params;
  const org = await requireOrgBySlug(orgSlug);

  const invoice = await api.invoices.byId({
    orgId: org.orgId,
    invoiceId,
  });

  if (!invoice) {
    return <p>Invoice not found</p>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
        <p className="text-sm text-muted-foreground">Invoice detail and payment link.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Status: {invoice.status}</p>
          <p>Amount Due: {formatMoney(invoice.amountDueMinor, invoice.currency)}</p>
          <p>Amount Paid: {formatMoney(invoice.amountPaidMinor, invoice.currency)}</p>
          <p>
            Outstanding: {formatMoney(invoice.health.outstandingMinor, invoice.currency)}
          </p>
          <p>Due Date: {formatDueDate(invoice.dueDate)}</p>
          <p>Contact: {invoice.contact?.name ?? "-"}</p>
          <p>
            Health:
            <span
              className={`ml-2 inline-flex rounded-md border px-2 py-0.5 text-xs ${healthBadgeClass(invoice.health.health)}`}
            >
              {invoice.health.health} ({invoice.health.score})
            </span>
          </p>
          {invoice.tags.length ? <p>Tags: {invoice.tags.join(", ")}</p> : null}
          {invoice.notes ? <p>Notes: {invoice.notes}</p> : null}
        </CardContent>
      </Card>

      {Array.isArray(invoice.lineItems) && invoice.lineItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoice.lineItems.map((item, index) => {
              const description =
                typeof item === "object" && item && "description" in item
                  ? String(item.description)
                  : `Line item ${index + 1}`;
              const quantity =
                typeof item === "object" && item && "quantity" in item
                  ? Number(item.quantity)
                  : 1;
              const totalAmountMinor =
                typeof item === "object" && item && "totalAmountMinor" in item
                  ? Number(item.totalAmountMinor)
                  : 0;

              return (
                <div key={`${description}-${index}`} className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {description} x {quantity}
                  </span>
                  <span>{formatMoney(totalAmountMinor, invoice.currency)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input readOnly value={invoice.payLinkUrl ?? ""} />
          <Button type="button">Copy Link</Button>
        </CardContent>
      </Card>
    </section>
  );
}
