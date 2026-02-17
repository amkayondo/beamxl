import { Badge } from "@/components/ui/badge";
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

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  const invoices = await api.invoices.list({
    orgId: org.orgId,
    page: 1,
    pageSize: 50,
  });

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = invoices.items.filter((invoice) => invoice.dueDate === today).length;
  const overdue = invoices.items.filter((invoice) => invoice.status === "OVERDUE").length;
  const paid = invoices.items.filter((invoice) => invoice.status === "PAID").length;
  const total = invoices.items.length;
  const collectionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Due today, overdue and collection metrics for {org.name}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{dueToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.items.slice(0, 10).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.contact?.name ?? "-"}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>
                    <Badge>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{invoice.amountDueMinor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
