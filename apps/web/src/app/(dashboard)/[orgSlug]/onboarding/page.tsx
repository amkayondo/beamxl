import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireOrgBySlug } from "@/lib/server-org";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  return <OnboardingWizard orgId={org.orgId} orgSlug={orgSlug} />;
}
