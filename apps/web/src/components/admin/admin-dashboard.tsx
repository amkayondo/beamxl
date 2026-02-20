"use client";

import Link from "next/link";

import { api } from "@/trpc/react";
import { StatCard } from "@/components/admin/stat-card";

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { data, isLoading, error } = api.systemAdmin.overview.useQuery();

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-sm text-red-400">
          Failed to load dashboard data: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            System-wide overview of DueFlow
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-medium">Recent Organizations</h3>
            <SkeletonTable />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-medium">Recent Users</h3>
            <SkeletonTable />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          System-wide overview of DueFlow
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Orgs" value={data.totalOrgs} />
        <StatCard title="Total Users" value={data.totalUsers} />
        <StatCard title="Total Contacts" value={data.totalContacts} />
        <StatCard title="Total Invoices" value={data.totalInvoices} />
        <StatCard title="Total Payments" value={data.totalPayments} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Organizations */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Recent Organizations</h3>
            <Link
              href="/admin/orgs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrgs.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orgs/${org.id}`}
                        className="font-medium hover:underline"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {org.slug}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.recentOrgs.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No organizations yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Users */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Recent Users</h3>
            <Link
              href="/admin/users"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium hover:underline"
                      >
                        {user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.systemRole} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data.recentUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") {
    return (
      <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-medium text-red-500">
        ADMIN
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      USER
    </span>
  );
}
