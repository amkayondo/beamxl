import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { resolvePortalAccountByToken } from "@/server/services/portal-auth.service";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const account = await resolvePortalAccountByToken(token);

  if (!account) {
    notFound();
  }

  const invoices = await db.query.invoices.findMany({
    where: (i, { and, eq, isNull }) =>
      and(
        eq(i.orgId, account.orgId),
        eq(i.contactId, account.contactId),
        isNull(i.deletedAt)
      ),
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  const openInvoices = invoices.filter((invoice) => invoice.status !== "PAID");

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{account.org.name} Client Portal</h1>
        <p className="text-sm text-muted-foreground">Manage invoices and requests for {account.contact.name}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {openInvoices.length === 0 ? (
            <p className="text-muted-foreground">No open invoices.</p>
          ) : (
            openInvoices.map((invoice) => {
              const outstandingMinor = Math.max(invoice.amountDueMinor - invoice.amountPaidMinor, 0);
              return (
                <div key={invoice.id} className="rounded-md border border-border px-3 py-2">
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-muted-foreground">
                    Status: {invoice.status} • Due: {new Date(invoice.dueDate).toLocaleDateString()} • Outstanding: ${(outstandingMinor / 100).toFixed(2)}
                  </p>
                  {invoice.payLinkUrl && (
                    <a href={invoice.payLinkUrl} className="text-primary underline" target="_blank">
                      Pay now
                    </a>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <form method="post" action={`/api/portal/${encodeURIComponent(token)}/actions`} className="space-y-2">
            <input type="hidden" name="action" value="dispute" />
            <label className="block text-sm font-medium">Dispute an invoice</label>
            <select name="invoiceId" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" required>
              <option value="">Select invoice</option>
              {openInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber}
                </option>
              ))}
            </select>
            <textarea name="details" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Describe the issue" required />
            <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" type="submit">
              Submit dispute
            </button>
          </form>

          <form method="post" action={`/api/portal/${encodeURIComponent(token)}/actions`} className="space-y-2">
            <input type="hidden" name="action" value="payment-plan" />
            <label className="block text-sm font-medium">Request a payment plan</label>
            <select name="invoiceId" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" required>
              <option value="">Select invoice</option>
              {openInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber}
                </option>
              ))}
            </select>
            <textarea name="notes" className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Preferred terms" />
            <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" type="submit">
              Submit request
            </button>
          </form>

          <form method="post" action={`/api/portal/${encodeURIComponent(token)}/actions`} className="space-y-2">
            <input type="hidden" name="action" value="preferences" />
            <label className="block text-sm font-medium">Contact preferences</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="allowSms" defaultChecked /> SMS</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="allowEmail" defaultChecked /> Email</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="allowWhatsapp" defaultChecked /> WhatsApp</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="allowVoice" defaultChecked /> Voice</label>
            <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" type="submit">
              Save preferences
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
