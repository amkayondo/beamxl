"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface OrgItem {
  id: string;
  slug: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
  createdAt: Date;
  deletedAt: Date | null;
  memberCount: number;
}

export function OrgListView() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const utils = api.useUtils();

  const { data, isLoading, error } = api.systemAdmin.listOrgs.useQuery({
    page,
    search: search || undefined,
  });

  const suspendOrg = api.systemAdmin.suspendOrg.useMutation({
    onSuccess: () => {
      void utils.systemAdmin.listOrgs.invalidate();
    },
  });

  const unsuspendOrg = api.systemAdmin.unsuspendOrg.useMutation({
    onSuccess: () => {
      void utils.systemAdmin.listOrgs.invalidate();
    },
  });

  const deleteOrg = api.systemAdmin.deleteOrg.useMutation({
    onSuccess: () => {
      void utils.systemAdmin.listOrgs.invalidate();
    },
  });

  function handleSuspend(orgId: string, orgName: string) {
    if (window.confirm(`Are you sure you want to suspend "${orgName}"?`)) {
      suspendOrg.mutate({ orgId });
    }
  }

  function handleUnsuspend(orgId: string) {
    unsuspendOrg.mutate({ orgId });
  }

  function handleDelete(orgId: string, orgName: string) {
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${orgName}"? This action cannot be undone.`,
      )
    ) {
      deleteOrg.mutate({ orgId });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Organizations</h2>
        <p className="text-sm text-muted-foreground">
          Manage all organizations on the platform
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">
            Failed to load organizations: {error.message}
          </p>
        </div>
      )}

      {/* Table */}
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
                Members
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Currency
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))}

            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No organizations found
                </td>
              </tr>
            )}

            {(data?.items as OrgItem[] | undefined)?.map((org) => {
              const isSuspended = !!org.deletedAt;
              return (
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
                    {org.memberCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.defaultCurrency}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        isSuspended
                          ? "bg-red-600/15 text-red-500"
                          : "bg-green-600/15 text-green-500",
                      )}
                    >
                      {isSuspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSuspended ? (
                        <button
                          onClick={() => handleUnsuspend(org.id)}
                          disabled={unsuspendOrg.isPending}
                          className="rounded px-2 py-1 text-xs font-medium text-green-500 hover:bg-green-600/15 disabled:opacity-50"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(org.id, org.name)}
                          disabled={suspendOrg.isPending}
                          className="rounded px-2 py-1 text-xs font-medium text-yellow-500 hover:bg-yellow-600/15 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        disabled={deleteOrg.isPending}
                        className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-600/15 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total
            organizations)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data.totalPages ?? 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
