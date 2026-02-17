import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            We sent a secure sign-in link{email ? ` to ${email}` : ""}. Open the link to continue.
          </p>
          <p>
            Didn&apos;t receive it? <Link className="text-primary" href="/sign-in">Try again</Link>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
