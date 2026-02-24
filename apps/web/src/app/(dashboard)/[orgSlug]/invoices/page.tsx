import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
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

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);
  const invoices = await api.invoices.list({
    orgId: org.orgId,
    page: 1,
    pageSize: 100,
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Track due, overdue and paid invoices.</p>
        </div>
        <Link href={`/${orgSlug}/invoices/import`}>
          <Button variant="outline">Import CSV</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.items.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link href={`/${orgSlug}/invoices/${invoice.id}`} className="text-primary">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.contact?.name ?? "-"}</TableCell>
                  <TableCell>{formatDueDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <Badge>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={healthBadgeClass(invoice.health.health)}>
                      {invoice.health.health} ({invoice.health.score})
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(invoice.amountDueMinor, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
