import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

import { LandingPage } from "./_components/landing-page";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    return <LandingPage />;
  }

  const org = await api.org.ensureDefaultOrg();
  redirect(`/${org.slug}/overview`);
}
