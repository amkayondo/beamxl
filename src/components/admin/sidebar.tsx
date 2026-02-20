"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin" },
  { label: "Organizations", href: "/admin/orgs" },
  { label: "Users", href: "/admin/users" },
  { label: "Audit Logs", href: "/admin/audit-logs" },
  { label: "Webhooks", href: "/admin/webhooks" },
  { label: "Queues", href: "/admin/queues" },
];

export function AdminSidebar({ active }: { active?: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (active) {
      return active === href;
    }
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-0 h-screen w-64 border-r border-border bg-sidebar px-4 py-6">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            DueFlow
          </p>
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">
            Admin
          </span>
        </div>
        <p className="text-lg font-semibold">System Panel</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive(item.href) &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="my-4 border-t border-border" />

      <nav>
        <Link
          href="/"
          className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Back to Dashboard
        </Link>
      </nav>
    </aside>
  );
}
