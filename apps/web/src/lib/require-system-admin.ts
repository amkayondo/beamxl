import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/server/better-auth/server";

export async function requireSystemAdmin() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { id: true, systemRole: true, name: true, email: true, image: true },
  });

  if (!dbUser || dbUser.systemRole !== "ADMIN") {
    redirect("/");
  }

  return dbUser;
}
