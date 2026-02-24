import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return (
    <SettingsPageClient
      orgSlug={orgSlug}
      orgId={org.orgId}
      org={{
        name: org.name ?? "My Organization",
        defaultCurrency: org.defaultCurrency ?? "USD",
        timezone: org.timezone ?? "UTC",
      }}
    />
  );
}
