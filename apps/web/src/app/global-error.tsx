"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          <div className="flex items-center gap-4">
            <button
              className="text-primary underline underline-offset-4"
              onClick={() => reset()}
              type="button"
            >
              Try again
            </button>
            <Link className="text-primary underline underline-offset-4" href="/">
              Return home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
