import { OrgDetailView } from "@/components/admin/org-detail-view";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return <OrgDetailView orgId={orgId} />;
}
