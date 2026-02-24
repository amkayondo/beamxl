import { redirect } from "next/navigation";

import { resolveActiveOrgSlug } from "@/lib/server-active-org";

export default async function BillingAliasPage() {
  const orgSlug = await resolveActiveOrgSlug();
  redirect(`/${orgSlug}/settings/billing`);
}
