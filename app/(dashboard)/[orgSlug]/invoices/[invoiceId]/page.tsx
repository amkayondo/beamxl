import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

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
          <p>Amount Due: {invoice.amountDueMinor}</p>
          <p>Amount Paid: {invoice.amountPaidMinor}</p>
          <p>Due Date: {invoice.dueDate}</p>
          <p>Contact: {invoice.contact?.name ?? "-"}</p>
        </CardContent>
      </Card>

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
