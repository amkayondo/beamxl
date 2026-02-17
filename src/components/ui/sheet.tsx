import * as React from "react";

import { cn } from "@/lib/utils";

export function Sheet({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SheetTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <aside className={cn("rounded-lg border border-border bg-card p-4", className)} {...props} />;
}
