"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface UserItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  systemRole: string;
  createdAt: Date;
}

export function UserListView() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const utils = api.useUtils();

  const { data, isLoading, error } = api.systemAdmin.listUsers.useQuery({
    page,
    search: search || undefined,
    role: roleFilter === "ALL" ? undefined : (roleFilter as "USER" | "ADMIN"),
  });

  const setSystemRole = api.systemAdmin.setSystemRole.useMutation({
    onSuccess: () => {
      void utils.systemAdmin.listUsers.invalidate();
    },
  });

  function handleRoleChange(userId: string, newRole: string, userName: string) {
    const action = newRole === "ADMIN" ? "promote" : "demote";
    if (
      window.confirm(
        `Are you sure you want to ${action} "${userName}" to ${newRole}?`,
      )
    ) {
      setSystemRole.mutate({ userId, role: newRole as "USER" | "ADMIN" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          Manage all users on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">All Roles</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">
            Failed to load users: {error.message}
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
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                System Role
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Email Verified
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Created
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
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))}

            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found
                </td>
              </tr>
            )}

            {(data?.items as UserItem[] | undefined)?.map((user) => (
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
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      user.emailVerified
                        ? "bg-green-600/15 text-green-500"
                        : "bg-yellow-600/15 text-yellow-500",
                    )}
                  >
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.systemRole === "ADMIN" ? (
                    <button
                      onClick={() =>
                        handleRoleChange(user.id, "USER", user.name)
                      }
                      disabled={setSystemRole.isPending}
                      className="rounded px-2 py-1 text-xs font-medium text-yellow-500 hover:bg-yellow-600/15 disabled:opacity-50"
                    >
                      Demote to User
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        handleRoleChange(user.id, "ADMIN", user.name)
                      }
                      disabled={setSystemRole.isPending}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-500 hover:bg-blue-600/15 disabled:opacity-50"
                    >
                      Promote to Admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total users)
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
