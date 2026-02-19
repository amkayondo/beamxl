"use client";

import Link from "next/link";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-muted", className)} />
  );
}

export function OrgDetailView({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = api.systemAdmin.getOrg.useQuery({
    orgId,
  });

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orgs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Organizations
        </Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm text-red-400">
            Failed to load organization: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orgs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Organizations
        </Link>
        <SkeletonBlock className="h-8 w-48" />
        <div className="rounded-lg border border-border p-6">
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-64" />
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-5 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      </div>
    );
  }

  const isSuspended = !!data.org.deletedAt;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orgs"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Organizations
      </Link>

      {/* Org Info */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{data.org.name}</h2>
          <p className="text-sm text-muted-foreground">{data.org.slug}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            isSuspended
              ? "bg-red-600/15 text-red-500"
              : "bg-green-600/15 text-green-500",
          )}
        >
          {isSuspended ? "Suspended" : "Active"}
        </span>
      </div>

      <div className="rounded-lg border border-border p-6">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Organization Details
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-0.5 text-sm font-medium">{data.org.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Slug</dt>
            <dd className="mt-0.5 text-sm font-medium">{data.org.slug}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Currency</dt>
            <dd className="mt-0.5 text-sm font-medium">{data.org.currency}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timezone</dt>
            <dd className="mt-0.5 text-sm font-medium">{data.org.timezone}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {new Date(data.org.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {isSuspended ? "Suspended" : "Active"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Contacts" value={data.stats.contactsCount} />
        <StatCard title="Invoices" value={data.stats.invoicesCount} />
        <StatCard title="Payments" value={data.stats.paymentsCount} />
      </div>

      {/* Members Table */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Members</h3>
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
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${member.userId}`}
                      className="font-medium hover:underline"
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        member.status === "active"
                          ? "bg-green-600/15 text-green-500"
                          : "bg-yellow-600/15 text-yellow-500",
                      )}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data.members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
