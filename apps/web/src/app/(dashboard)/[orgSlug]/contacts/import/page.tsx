import { ContactsImportWizard } from "@/components/import/contacts-import-wizard";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function ContactsImportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <ContactsImportWizard orgId={org.orgId} orgSlug={orgSlug} />;
}
