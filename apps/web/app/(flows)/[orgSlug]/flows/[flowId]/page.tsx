import { FlowEditorPage } from "@/components/flows/flow-editor-page";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function FlowEditorRoute({
  params,
}: {
  params: Promise<{ orgSlug: string; flowId: string }>;
}) {
  const { orgSlug, flowId } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <FlowEditorPage orgSlug={orgSlug} orgId={org.orgId} flowId={flowId} />;
}
