"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface WebhookEventItem {
  id: string;
  provider: string;
  providerEventId: string;
  orgId: string | null;
  signatureVerified: boolean;
  status: string;
  payload: unknown;
  error: string | null;
  receivedAt: Date;
  processedAt: Date | null;
}

interface Filters {
  provider: string;
  status: string;
  orgId: string;
}

const defaultFilters: Filters = {
  provider: "",
  status: "",
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

const statusColors: Record<string, string> = {
  RECEIVED: "bg-yellow-100 text-yellow-800",
  PROCESSED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function WebhookMonitor() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } =
    api.systemAdmin.listWebhookEvents.useQuery(
      {
        page,
        limit: 20,
        provider: appliedFilters.provider || undefined,
        status: (appliedFilters.status || undefined) as "RECEIVED" | "PROCESSED" | "FAILED" | undefined,
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
            Webhook Events
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor incoming webhook events from payment providers
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
              Provider
            </label>
            <select
              value={filters.provider}
              onChange={(e) =>
                setFilters((f) => ({ ...f, provider: e.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="STRIPE">STRIPE</option>
              <option value="BIRD">BIRD</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="PROCESSED">PROCESSED</option>
              <option value="FAILED">FAILED</option>
            </select>
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
                Received At
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Provider
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Event ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Org ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Verified
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
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
                  No webhook events found
                </td>
              </tr>
            ) : (
              (data.items as WebhookEventItem[]).map((event) => {
                const isExpanded = expandedRows.has(event.id);

                return (
                  <tr
                    key={event.id}
                    className="group border-b border-border last:border-b-0"
                  >
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <div
                        className={cn(
                          "flex cursor-pointer items-center transition-colors hover:bg-muted/30",
                          isExpanded && "bg-muted/20",
                        )}
                        onClick={() => toggleRow(event.id)}
                      >
                        <div className="w-[180px] shrink-0 px-4 py-3 text-foreground">
                          {formatDate(event.receivedAt)}
                        </div>
                        <div className="w-[100px] shrink-0 px-4 py-3">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {event.provider}
                          </span>
                        </div>
                        <div className="w-[160px] shrink-0 truncate px-4 py-3 font-mono text-xs text-foreground">
                          {event.providerEventId}
                        </div>
                        <div className="w-[140px] shrink-0 truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                          {event.orgId ?? "\u2014"}
                        </div>
                        <div className="w-[80px] shrink-0 px-4 py-3 text-center">
                          {event.signatureVerified ? (
                            <span className="text-green-600" title="Verified">
                              &#10003;
                            </span>
                          ) : (
                            <span className="text-red-500" title="Not verified">
                              &#10007;
                            </span>
                          )}
                        </div>
                        <div className="w-[110px] shrink-0 px-4 py-3">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                              statusColors[event.status] ??
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {event.status}
                          </span>
                        </div>
                        <div className="w-10 shrink-0 px-4 py-3 text-center text-muted-foreground">
                          <span
                            className={cn(
                              "inline-block transition-transform",
                              isExpanded && "rotate-90",
                            )}
                          >
                            &#9654;
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="space-y-3 border-t border-border bg-muted/10 px-6 py-4">
                          {event.processedAt && (
                            <p className="text-xs text-muted-foreground">
                              Processed at: {formatDate(event.processedAt)}
                            </p>
                          )}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Payload
                            </p>
                            <pre className="overflow-auto rounded bg-muted/50 p-3 text-xs max-h-64">
                              {JSON.stringify(event.payload, null, 2)}
                            </pre>
                          </div>
                          {event.error && (
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                                Error
                              </p>
                              <pre className="overflow-auto rounded bg-red-50 p-3 text-xs text-red-800 max-h-40">
                                {event.error}
                              </pre>
                            </div>
                          )}
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
            events)
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
