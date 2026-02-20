import { AutomationPageClient } from "@/components/automation/automation-page-client";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);
  return <AutomationPageClient orgSlug={orgSlug} orgId={org.orgId} />;
}
