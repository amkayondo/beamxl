import { AuditLogsClient } from "@/components/audit/audit-logs-client";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function AuditLogsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <AuditLogsClient orgId={org.orgId} />;
}
