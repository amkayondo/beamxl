import { InvoicesImportWizard } from "@/components/import/invoices-import-wizard";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function InvoicesImportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <InvoicesImportWizard orgId={org.orgId} orgSlug={orgSlug} />;
}
