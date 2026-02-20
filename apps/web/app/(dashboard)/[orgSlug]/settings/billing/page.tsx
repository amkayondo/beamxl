import { BillingPageClient } from "@/components/settings/billing-page-client";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function BillingSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <BillingPageClient orgId={org.orgId} orgSlug={orgSlug} />;
}
