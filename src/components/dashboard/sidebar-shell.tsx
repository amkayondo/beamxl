"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function SidebarShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  );
}

export { SidebarInset };
