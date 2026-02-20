"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

const ENTITY_TYPES = [
  "All",
  "Contact",
  "Invoice",
  "Flow",
  "AutomationRule",
  "Tag",
  "MessageTemplate",
  "Organization",
];

export function AuditLogsClient({ orgId }: { orgId: string }) {
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = api.audit.list.useQuery({
    orgId,
    entityType: entityTypeFilter || undefined,
    page,
    pageSize: 20,
  });

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Track all changes made to your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Activity Log</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All Entities</option>
                {ENTITY_TYPES.filter((t) => t !== "All").map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : logs.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <>
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className="border-zinc-700 bg-zinc-700/20 text-zinc-300">
                            {log.actorType === "USER"
                              ? (log as any).actorUser?.name ?? log.actorUserId?.slice(0, 8) ?? "User"
                              : log.actorType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>{log.entityType}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                          {log.entityId}
                        </TableCell>
                        <TableCell className="text-right">
                          {(log.before || log.after) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedId(expandedId === log.id ? null : log.id)
                              }
                            >
                              {expandedId === log.id ? "Hide" : "Show"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedId === log.id ? (
                        <TableRow key={`${log.id}-detail`}>
                          <TableCell colSpan={6}>
                            <div className="grid gap-4 rounded-md bg-muted/50 p-3 sm:grid-cols-2">
                              {log.before ? (
                                <div>
                                  <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
                                  <pre className="max-h-40 overflow-auto text-xs">
                                    {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {log.after ? (
                                <div>
                                  <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
                                  <pre className="max-h-40 overflow-auto text-xs">
                                    {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} entries)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No audit log entries found.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
