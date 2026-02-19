import { requireOrgBySlug } from "@/lib/server-org";
import { ComplianceSettingsPage } from "@/components/compliance/compliance-settings-page";

export default async function ComplianceSettingsPageRoute({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <ComplianceSettingsPage orgId={org.orgId} />;
}
