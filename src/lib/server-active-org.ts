import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_ORG_COOKIE, LEGACY_ACTIVE_ORG_COOKIE } from "@/lib/org-cookie";
import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

export async function resolveActiveOrgSlug() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const memberships = await api.org.listMine();
  if (!memberships.length) {
    const created = await api.org.ensureDefaultOrg();
    return created.slug;
  }

  const cookieStore = await cookies();
  const savedSlug =
    cookieStore.get(ACTIVE_ORG_COOKIE)?.value ??
    cookieStore.get(LEGACY_ACTIVE_ORG_COOKIE)?.value;

  const matched = memberships.find((org) => org.slug === savedSlug);
  return matched?.slug ?? memberships[0]!.slug;
}
