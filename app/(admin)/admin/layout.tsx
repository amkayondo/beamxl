import { requireSystemAdmin } from "@/lib/require-system-admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireSystemAdmin();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1600px]">
        <AdminSidebar />
        <main className="flex-1">
          <AdminHeader userName={adminUser.name} />
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
