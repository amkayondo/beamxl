import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  const exportData = await api.reports.exportInvoicesCsv({
    orgId: org.orgId,
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Export invoice ledgers for finance reconciliation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice CSV Export</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href={exportData.downloadUrl}>
            <Button type="button">Download CSV</Button>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
