import { redirect } from "next/navigation";

import { resolveActiveOrgSlug } from "@/lib/server-active-org";

export default async function FlowEditorAliasPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = await params;
  const orgSlug = await resolveActiveOrgSlug();

  redirect(`/${orgSlug}/flows/${flowId}`);
}
