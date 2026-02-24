import { redirect } from "next/navigation";

import { requireOrgBySlug } from "@/lib/server-org";
import { api } from "@/trpc/server";
import { OverviewClient } from "@/components/dashboard/overview-client";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await requireOrgBySlug(orgSlug);

  // New users who haven't finished step 1 get sent straight to onboarding.
  const onboardingState = await api.onboarding.getState({ orgId: org.orgId });
  if (
    !onboardingState.onboarding.isComplete &&
    onboardingState.onboarding.currentStepId === 1
  ) {
    redirect(`/${orgSlug}/onboarding`);
  }

  return (
    <OverviewClient
      orgId={org.orgId}
      orgName={org.name}
      onboardingComplete={onboardingState.onboarding.isComplete}
      onboardingStep={onboardingState.onboarding.currentStepId}
    />
  );
}
