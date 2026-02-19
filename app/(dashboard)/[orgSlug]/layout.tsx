import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex flex-1 items-center gap-2">
            <span className="text-sm font-medium">{activeOrg.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell orgId={activeOrg.orgId} />
          </div>
        </header>
        <div className="p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
