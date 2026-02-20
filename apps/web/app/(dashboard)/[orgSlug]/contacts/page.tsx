import { ContactsPageClient } from "@/components/contacts/contacts-page-client";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <ContactsPageClient orgSlug={orgSlug} orgId={org.orgId} />;
}
