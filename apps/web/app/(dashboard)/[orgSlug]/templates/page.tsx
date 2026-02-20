import { TemplatesPageClient } from "@/components/templates/templates-page-client";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <TemplatesPageClient orgSlug={orgSlug} orgId={org.orgId} />;
}
