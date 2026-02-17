import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const org = await api.org.ensureDefaultOrg();
  redirect(`/${org.slug}/overview`);
}
