import { requireOrgBySlug } from "@/lib/server-org";
import { ConversationsPageClient } from "@/components/conversations/conversations-page-client";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <ConversationsPageClient orgSlug={orgSlug} orgId={org.orgId} />;
}
