import { redirect } from "next/navigation";

import { api } from "@/trpc/server";

export async function requireOrgBySlug(slug: string) {
  const orgs = await api.org.listMine();
  const org = orgs.find((item) => item.slug === slug);

  if (!org) {
    if (orgs[0]) {
      redirect(`/${orgs[0].slug}/overview`);
    }
    redirect("/sign-in");
  }

  return org;
}
