import { redirect } from "next/navigation";

import { resolveActiveOrgSlug } from "@/lib/server-active-org";

export default async function FlowsAliasPage() {
  const orgSlug = await resolveActiveOrgSlug();
  redirect(`/${orgSlug}/flows`);
}
