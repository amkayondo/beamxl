"use client";

import Link from "next/link";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-muted", className)} />
  );
}

export function UserDetailView({ userId }: { userId: string }) {
  const { data, isLoading, error } = api.systemAdmin.getUser.useQuery({
    userId,
  });

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Users
        </Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm text-red-400">
            Failed to load user: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Users
        </Link>
        <SkeletonBlock className="h-8 w-48" />
        <div className="rounded-lg border border-border p-6">
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-64" />
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-5 w-36" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Users
      </Link>

      {/* User Info */}
      <div className="flex items-start gap-4">
        {data.user.image && (
          <img
            src={data.user.image}
            alt={data.user.name}
            className="h-16 w-16 rounded-full border border-border"
          />
        )}
        <div>
          <h2 className="text-xl font-semibold">{data.user.name}</h2>
          <p className="text-sm text-muted-foreground">{data.user.email}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          User Details
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-0.5 text-sm font-medium">{data.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-0.5 text-sm font-medium">{data.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">System Role</dt>
            <dd className="mt-0.5">
              <RoleBadge role={data.user.systemRole} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email Verified</dt>
            <dd className="mt-0.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  data.user.emailVerified
                    ? "bg-green-600/15 text-green-500"
                    : "bg-yellow-600/15 text-yellow-500",
                )}
              >
                {data.user.emailVerified ? "Verified" : "Unverified"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {new Date(data.user.createdAt).toLocaleDateString()}
            </dd>
          </div>
          {data.user.image && (
            <div>
              <dt className="text-xs text-muted-foreground">Image</dt>
              <dd className="mt-0.5 text-sm font-medium truncate">
                {data.user.image}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Organization Memberships */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Organization Memberships</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Organization
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Slug
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
              {data.memberships.map((membership) => (
                <tr
                  key={membership.orgId}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orgs/${membership.orgId}`}
                      className="font-medium hover:underline"
                    >
                      {membership.orgName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {membership.orgSlug}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {membership.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        membership.status === "active"
                          ? "bg-green-600/15 text-green-500"
                          : "bg-yellow-600/15 text-yellow-500",
                      )}
                    >
                      {membership.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(membership.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data.memberships.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No organization memberships
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
