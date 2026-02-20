"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  orgId: string;
  actorType: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

interface Filters {
  action: string;
  entityType: string;
  startDate: string;
  endDate: string;
  orgId: string;
}

const defaultFilters: Filters = {
  action: "",
  entityType: "",
  startDate: "",
  endDate: "",
  orgId: "",
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogViewer() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = api.systemAdmin.listAuditLogs.useQuery(
    {
      page,
      limit: 20,
      action: appliedFilters.action || undefined,
      entityType: appliedFilters.entityType || undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
      orgId: appliedFilters.orgId || undefined,
    },
    { refetchInterval: autoRefresh ? 10000 : false },
  );

  function applyFilters() {
    setAppliedFilters({ ...filters });
    setPage(1);
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground">
            System-wide audit trail of all actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-border"
            />
            Auto-refresh
          </label>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Action
            </label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) =>
                setFilters((f) => ({ ...f, action: e.target.value }))
              }
              placeholder="e.g. CREATE"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Entity Type
            </label>
            <input
              type="text"
              value={filters.entityType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, entityType: e.target.value }))
              }
              placeholder="e.g. INVOICE"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, startDate: e.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, endDate: e.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Org ID
            </label>
            <input
              type="text"
              value={filters.orgId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, orgId: e.target.value }))
              }
              placeholder="Optional"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={applyFilters}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Actor Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Actor
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Action
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Entity Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Entity ID
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No audit logs found
                </td>
              </tr>
            ) : (
              (data.items as AuditLogItem[]).map((log) => {
                const isExpanded = expandedRows.has(log.id);
                const hasDiff = log.before != null || log.after != null;

                return (
                  <tr
                    key={log.id}
                    className="group border-b border-border last:border-b-0"
                  >
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <div
                        className={cn(
                          "flex cursor-pointer items-center transition-colors hover:bg-muted/30",
                          isExpanded && "bg-muted/20",
                        )}
                        onClick={() => hasDiff && toggleRow(log.id)}
                      >
                        <div className="w-[180px] shrink-0 px-4 py-3 text-foreground">
                          {formatDate(log.createdAt)}
                        </div>
                        <div className="w-[100px] shrink-0 px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {log.actorType}
                          </span>
                        </div>
                        <div className="w-[140px] shrink-0 truncate px-4 py-3 text-foreground">
                          {log.actorName ?? log.actorType}
                        </div>
                        <div className="w-[120px] shrink-0 px-4 py-3">
                          <span className="font-mono text-xs text-foreground">
                            {log.action}
                          </span>
                        </div>
                        <div className="w-[120px] shrink-0 px-4 py-3 text-foreground">
                          {log.entityType}
                        </div>
                        <div className="min-w-0 flex-1 truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                          {log.entityId}
                        </div>
                        <div className="w-10 shrink-0 px-4 py-3 text-center text-muted-foreground">
                          {hasDiff ? (
                            <span
                              className={cn(
                                "inline-block transition-transform",
                                isExpanded && "rotate-90",
                              )}
                            >
                              &#9654;
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">
                              &mdash;
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && hasDiff && (
                        <div className="border-t border-border bg-muted/10 px-6 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {log.before != null && (
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Before
                                </p>
                                <pre className="overflow-auto rounded bg-muted/50 p-3 text-xs max-h-64">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after != null && (
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  After
                                </p>
                                <pre className="overflow-auto rounded bg-muted/50 p-3 text-xs max-h-64">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {data.page} of {data.totalPages} ({data.total} total
            entries)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (data?.totalPages ?? 1)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
