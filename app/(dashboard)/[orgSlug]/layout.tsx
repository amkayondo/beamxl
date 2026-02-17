import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1600px]">
        <DashboardSidebar orgSlug={activeOrg.slug} />
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-8 py-4 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Workspace</p>
              <p className="text-lg font-medium">{activeOrg.name}</p>
            </div>
            <OrgSwitcher
              orgs={orgs.map((org) => ({
                orgId: org.orgId,
                slug: org.slug,
                name: org.name,
              }))}
              currentSlug={activeOrg.slug}
            />
          </header>
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
