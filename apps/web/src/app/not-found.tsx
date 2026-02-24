import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you requested does not exist or is no longer available.
      </p>
      <Link className="text-primary underline underline-offset-4" href="/">
        Return to DueFlow
      </Link>
    </main>
  );
}
