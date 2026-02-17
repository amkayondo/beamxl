import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "overview" },
  { label: "Contacts", href: "contacts" },
  { label: "Plans", href: "plans" },
  { label: "Invoices", href: "invoices" },
  { label: "Conversations", href: "conversations" },
  { label: "Automation", href: "automation" },
  { label: "Calls", href: "calls" },
  { label: "Reports", href: "reports" },
  { label: "Settings", href: "settings" },
];

export function DashboardSidebar(props: { orgSlug: string; active?: string }) {
  return (
    <aside className="sticky top-0 h-screen w-64 border-r border-border bg-sidebar px-4 py-6">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">BeamFlow</p>
        <p className="text-lg font-semibold">Collections OS</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const href = `/${props.orgSlug}/${item.href}`;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                props.active === item.href && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
