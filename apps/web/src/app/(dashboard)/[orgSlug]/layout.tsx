import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { HeaderCreditMeter } from "@/components/billing/header-credit-meter";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const { orgSlug } = await params;
  const orgs = await api.org.listMine();

  if (!orgs.length) {
    const created = await api.org.ensureDefaultOrg();
    redirect(`/${created.slug}/overview`);
  }

  const activeOrg = orgs.find((org) => org.slug === orgSlug) ?? orgs[0];
  if (!activeOrg) {
    redirect("/sign-in");
  }

  if (activeOrg.slug !== orgSlug) {
    redirect(`/${activeOrg.slug}/overview`);
  }

  // Day-14 trial gate: no Stripe subscription after 14 days → redirect to plans.
  const TRIAL_DAYS = 14;
  const trialDeadline = new Date(
    new Date(activeOrg.createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  );
  const isTrialExpired =
    !activeOrg.stripeSubscriptionId && new Date() > trialDeadline;

  if (isTrialExpired) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? "";
    const gatedPrefixes = [
      `/${orgSlug}/settings/billing`,
      `/${orgSlug}/onboarding`,
      `/${orgSlug}/settings`,
    ];
    const isAllowed = gatedPrefixes.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      redirect(`/${orgSlug}/settings/billing?trialExpired=true`);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        orgSlug={activeOrg.slug}
        orgs={orgs.map((org) => ({
          orgId: org.orgId,
          slug: org.slug,
          name: org.name,
        }))}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex flex-1 items-center gap-2">
            <span className="text-sm font-medium">{activeOrg.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <HeaderCreditMeter orgId={activeOrg.orgId} orgSlug={activeOrg.slug} />
            <NotificationBell orgId={activeOrg.orgId} />
          </div>
        </header>
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
