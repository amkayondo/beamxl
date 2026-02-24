import { redirect } from "next/navigation";

import { api } from "@/trpc/server";

export async function requireOrgBySlug(
  slug: string,
  options?: {
    requireAutomationAccess?: boolean;
  },
) {
  const orgs = await api.org.listMine();
  const org = orgs.find((item) => item.slug === slug);

  if (!org) {
    if (orgs[0]) {
      redirect(`/${orgs[0].slug}/overview`);
    }
    redirect("/sign-in");
  }

  if (options?.requireAutomationAccess) {
    const onboardingState = await api.onboarding.getState({ orgId: org.orgId });
    if (!onboardingState.onboarding.isComplete) {
      redirect(
        `/${org.slug}/onboarding?blocked=automation&step=${onboardingState.onboarding.currentStepId}`,
      );
    }
  }

  return org;
}
