import { requireOrgBySlug } from "@/lib/server-org";
import { OverviewClient } from "@/components/dashboard/overview-client";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);
  return <OverviewClient orgId={org.orgId} orgName={org.name} />;
}
