"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FLOW_FILTERS, formatRelativeTime } from "@/lib/flows/mock";
import type { FlowStatus } from "@/lib/flows/types";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const statusStyles: Record<FlowStatus, string> = {
  DRAFT: "border-zinc-700 bg-zinc-700/20 text-zinc-200",
  ACTIVE: "border-emerald-500/40 bg-emerald-500/20 text-emerald-200",
  PAUSED: "border-amber-500/40 bg-amber-500/20 text-amber-200",
};

export function FlowListPage({ orgSlug, orgId }: { orgSlug: string; orgId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | FlowStatus>("ALL");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data, isLoading } = api.flows.list.useQuery({
    orgId,
    page: 1,
    pageSize: 50,
  });

  const createMutation = api.flows.create.useMutation({
    onSuccess: (result) => {
      void utils.flows.list.invalidate();
      router.push(`/${orgSlug}/flows/${result.id}`);
    },
  });

  const deleteMutation = api.flows.delete.useMutation({
    onSuccess: () => {
      void utils.flows.list.invalidate();
      setPendingDeleteId(null);
    },
  });

  const duplicateMutation = api.flows.duplicate.useMutation({
    onSuccess: () => {
      void utils.flows.list.invalidate();
    },
  });

  const flows = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return flows.filter((flow) => {
      const statusMatch = filter === "ALL" ? true : flow.status === filter;
      const queryMatch = q ? flow.name.toLowerCase().includes(q) : true;
      return statusMatch && queryMatch;
    });
  }, [filter, flows, query]);

  function handleNewFlow() {
    createMutation.mutate({ orgId });
  }

  function handleDuplicate(flowId: string) {
    duplicateMutation.mutate({ orgId, flowId });
  }

  function handleDelete() {
    if (!pendingDeleteId) return;
    deleteMutation.mutate({ orgId, flowId: pendingDeleteId });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Flows</h1>
          <p className="text-sm text-muted-foreground">Automate follow-ups with visual workflows.</p>
        </div>
        <Button type="button" onClick={handleNewFlow} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "New Flow"}
        </Button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search flows"
            className="max-w-sm border-zinc-800 bg-zinc-900 text-zinc-100"
          />

          <div className="flex flex-wrap items-center gap-2">
            {FLOW_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === item.value
                    ? "border-zinc-500 bg-zinc-700/40 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-zinc-400">Loading flows...</p>
        ) : filtered.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flow name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium text-zinc-100">{flow.name}</TableCell>
                  <TableCell>
                    <Badge className={statusStyles[flow.status]}>{flow.status}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {formatRelativeTime(flow.updatedAt?.toString() ?? new Date().toISOString())}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/${orgSlug}/flows/${flow.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(flow.id)}
                        disabled={duplicateMutation.isPending}
                      >
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPendingDeleteId(flow.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-10 text-center">
            <p className="text-sm text-zinc-300">No flows yet</p>
            <p className="mt-1 text-xs text-zinc-500">Create a new flow to start designing your follow-up automation.</p>
            <Button type="button" className="mt-4" onClick={handleNewFlow} disabled={createMutation.isPending}>
              New Flow
            </Button>
          </div>
        )}
      </div>

      {pendingDeleteId ? (
        <Dialog>
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <DialogContent className="z-50 w-full max-w-md border-zinc-700 bg-zinc-900 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Delete flow?</DialogTitle>
              </DialogHeader>
              <p className="mt-1 text-sm text-zinc-400">
                This permanently removes the flow and all its run history.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
