import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

export default async function SignInPage() {
  const session = await getSession();

  if (session?.user) {
    const org = await api.org.ensureDefaultOrg();
    redirect(`/${org.slug}/overview`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in to BeamFlow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={async (formData) => {
              "use server";

              const email = String(formData.get("email") ?? "").trim();
              if (!email) return;

              await auth.api.signInMagicLink({
                body: {
                  email,
                  callbackURL: "/",
                },
                headers: await headers(),
              });

              redirect(`/verify?email=${encodeURIComponent(email)}`);
            }}
            className="space-y-3"
          >
            <Input type="email" name="email" placeholder="you@company.com" required />
            <Button type="submit" className="w-full">
              Send Magic Link
            </Button>
          </form>

          <form
            action={async () => {
              "use server";
              const res = await auth.api.signInSocial({
                body: {
                  provider: "google",
                  callbackURL: "/",
                },
              });

              if (res.url) {
                redirect(res.url);
              }
            }}
          >
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
