import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";

export default async function FlowEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
