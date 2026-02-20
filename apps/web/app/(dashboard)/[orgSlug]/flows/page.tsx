import { FlowListPage } from "@/components/flows/flow-list-page";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function FlowsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <FlowListPage orgSlug={orgSlug} orgId={org.orgId} />;
}
