"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Viewport,
} from "@xyflow/react";

import { FlowCanvas } from "@/components/flows/flow-canvas";
import { InspectorPanel } from "@/components/flows/inspector-panel";
import { NodePalette } from "@/components/flows/node-palette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createNodeFromPalette } from "@/lib/flows/node-factory";
import type {
  FlowEdge,
  FlowNode,
  FlowNodeKind,
  FlowStatus,
  SwitchBranch,
} from "@/lib/flows/types";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const statusStyles: Record<FlowStatus, string> = {
  DRAFT: "border-zinc-700 bg-zinc-700/20 text-zinc-200",
  ACTIVE: "border-emerald-500/40 bg-emerald-500/20 text-emerald-200",
  PAUSED: "border-amber-500/40 bg-amber-500/20 text-amber-200",
};

const defaultViewport: Viewport = { x: 320, y: 100, zoom: 0.75 };

export function FlowEditorPage({
  orgSlug,
  orgId,
  flowId,
}: {
  orgSlug: string;
  orgId: string;
  flowId: string;
}) {
  const router = useRouter();

  const [flowName, setFlowName] = useState("Flow");
  const [status, setStatus] = useState<FlowStatus>("DRAFT");
  const [viewport, setViewport] = useState<Viewport>(defaultViewport);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<FlowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<Array<{ nodeId: string; action: string; detail: string }> | null>(null);

  const { data: flowData } = api.flows.byId.useQuery(
    { orgId, flowId },
    { enabled: !loaded }
  );

  const saveMutation = api.flows.update.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      setNotice("Saved");
    },
  });

  const testRunMutation = api.flows.testRun.useMutation({
    onSuccess: (result) => {
      setTestLog(result.log as any);
      setNotice("Test run complete — see results below");
    },
    onError: () => {
      setNotice("Test run failed");
    },
  });

  useEffect(() => {
    if (!flowData || loaded) return;

    setFlowName(flowData.name);
    setStatus(flowData.status as FlowStatus);
    setNodes((flowData.nodesJson ?? []) as FlowNode[]);
    setEdges((flowData.edgesJson ?? []) as FlowEdge[]);
    setViewport((flowData.viewportJson as Viewport) ?? defaultViewport);
    setLoaded(true);
    setIsDirty(false);
    setSelectedNodeId(null);
  }, [flowData, loaded, setEdges, setNodes]);

  const selectedNode = useMemo(() => {
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      )
        return;

      if (!selectedNodeId) return;

      event.preventDefault();
      setPendingDeleteNodeId(selectedNodeId);
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [selectedNodeId]);

  const onNodesChange = useCallback<typeof onNodesChangeBase>(
    (changes) => {
      setIsDirty(true);
      onNodesChangeBase(changes);
    },
    [onNodesChangeBase]
  );

  const onEdgesChange = useCallback<typeof onEdgesChangeBase>(
    (changes) => {
      setIsDirty(true);
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase]
  );

  const getBranchLabel = useCallback(
    (sourceId: string | null, sourceHandle: string | null) => {
      if (!sourceId || !sourceHandle) return undefined;

      const sourceNode = nodes.find((node) => node.id === sourceId);
      if (!sourceNode || sourceNode.data.nodeKind !== "switch") return undefined;

      return sourceNode.data.branches.find((branch) => branch.id === sourceHandle)?.name;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const label = getBranchLabel(connection.source, connection.sourceHandle);

      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: `edge-${connection.source ?? "unknown"}-${connection.target ?? "unknown"}-${Date.now()}`,
            type: "labeled",
            label,
            data: connection.sourceHandle ? { branchId: connection.sourceHandle } : undefined,
          },
          current
        )
      );
      setIsDirty(true);
    },
    [getBranchLabel, setEdges]
  );

  const updateNodeData = useCallback(
    (nodeId: string, partialData: Record<string, unknown>) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...partialData } }
            : node
        )
      );
      setIsDirty(true);
    },
    [setNodes]
  );

  const updateSwitchBranches = useCallback(
    (nodeId: string, branches: SwitchBranch[]) => {
      const sourceNode = nodes.find((node) => node.id === nodeId);
      if (!sourceNode || sourceNode.data.nodeKind !== "switch") return;

      const previousIds = sourceNode.data.branches.map((b) => b.id);
      const nextIds = branches.map((b) => b.id);
      const removedIds = previousIds.filter((id) => !nextIds.includes(id));
      const labelById = new Map(branches.map((b) => [b.id, b.name]));

      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId && node.data.nodeKind === "switch"
            ? { ...node, data: { ...node.data, branches } }
            : node
        )
      );

      setEdges((current) =>
        current
          .filter((edge) => {
            if (edge.source !== nodeId || !edge.sourceHandle) return true;
            return !removedIds.includes(edge.sourceHandle);
          })
          .map((edge) => {
            if (edge.source === nodeId && edge.sourceHandle) {
              return {
                ...edge,
                label: labelById.get(edge.sourceHandle) ?? edge.label,
                data: { ...edge.data, branchId: edge.sourceHandle },
              };
            }
            return edge;
          })
      );

      setIsDirty(true);
    },
    [nodes, setEdges, setNodes]
  );

  const handleDropNode = useCallback(
    (kind: FlowNodeKind, position: { x: number; y: number }) => {
      const node = createNodeFromPalette(kind, position);
      setNodes((current) => [...current, node]);
      setSelectedNodeId(node.id);
      setIsDirty(true);
    },
    [setNodes]
  );

  const handleSave = useCallback(() => {
    saveMutation.mutate({
      orgId,
      flowId,
      name: flowName.trim() || "Untitled Flow",
      status,
      nodesJson: nodes,
      edgesJson: edges,
      viewportJson: viewport,
    });
  }, [edges, flowId, flowName, nodes, orgId, saveMutation, status, viewport]);

  const handleTestRun = useCallback(() => {
    testRunMutation.mutate({
      orgId,
      flowId,
      mockContext: {
        eventType: "Invoice Overdue",
        amount: 15000,
        daysOverdue: 5,
        contactTags: ["vip"],
      },
    });
  }, [orgId, flowId, testRunMutation]);

  const handleDeleteNode = useCallback(() => {
    if (!pendingDeleteNodeId) return;

    setNodes((current) => current.filter((node) => node.id !== pendingDeleteNodeId));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== pendingDeleteNodeId && edge.target !== pendingDeleteNodeId
      )
    );

    setSelectedNodeId((current) => (current === pendingDeleteNodeId ? null : current));
    setPendingDeleteNodeId(null);
    setIsDirty(true);
  }, [pendingDeleteNodeId, setEdges, setNodes]);

  function togglePublish() {
    setStatus((current) => (current === "ACTIVE" ? "PAUSED" : "ACTIVE"));
    setIsDirty(true);
  }

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Loading flow…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-zinc-950">
      {/* Full-screen canvas */}
      <ReactFlowProvider>
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          viewport={viewport}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectNode={setSelectedNodeId}
          onDropNode={handleDropNode}
          onViewportChange={setViewport}
        />
      </ReactFlowProvider>

      {/* ── Floating top bar ── */}
      <header className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-3">
        {/* Left group */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 shadow-xl backdrop-blur">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-zinc-700"
            onClick={() => router.push(`/${orgSlug}/flows`)}
          >
            Back
          </Button>
          <div className="h-4 w-px bg-zinc-700" />
          <Input
            value={flowName}
            onChange={(event) => {
              setFlowName(event.target.value);
              setIsDirty(true);
            }}
            className="h-8 w-48 border-zinc-700 bg-transparent text-sm text-zinc-100 focus-visible:ring-0"
          />
          <Badge className={statusStyles[status]}>{status}</Badge>
          {isDirty && (
            <Badge className="border-zinc-700 bg-zinc-800 text-zinc-400">Unsaved</Badge>
          )}
          {notice && <span className="text-xs text-zinc-400">{notice}</span>}
        </div>

        {/* Right group */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 shadow-xl backdrop-blur">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-zinc-700"
            onClick={handleTestRun}
            disabled={testRunMutation.isPending}
          >
            {testRunMutation.isPending ? "Running…" : "Test"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            onClick={togglePublish}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
              status === "ACTIVE"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                status === "ACTIVE" ? "bg-emerald-400" : "bg-zinc-500"
              )}
            />
            Publish
          </button>
        </div>
      </header>

      {/* ── Floating left panel — Node Palette ── */}
      <div className="absolute bottom-3 left-3 top-17 z-10 w-67">
        <NodePalette />
      </div>

      {/* ── Floating right panel — Inspector ── */}
      <div className="absolute bottom-3 right-3 top-17 z-10 w-75">
        <InspectorPanel
          node={selectedNode}
          updateNodeData={updateNodeData}
          updateSwitchBranches={updateSwitchBranches}
        />
      </div>

      {/* ── Test log toast ── */}
      {testLog && (
        <div className="absolute bottom-3 left-1/2 z-20 w-120 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">Test Run Results</h3>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setTestLog(null)}>
              Dismiss
            </Button>
          </div>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {testLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge className="shrink-0 border-zinc-700 bg-zinc-800 text-zinc-300">{entry.action}</Badge>
                <span className="text-zinc-400">{entry.detail}</span>
              </div>
            ))}
            {testLog.length === 0 && (
              <p className="text-xs text-zinc-500">No steps executed. Check that the flow has a matching trigger.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {pendingDeleteNodeId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <DialogContent className="z-50 w-full max-w-md border-zinc-700 bg-zinc-900 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Delete selected node?</DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-sm text-zinc-400">
              This removes the node and all connected edges from this flow.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDeleteNodeId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteNode}>
                Delete node
              </Button>
            </div>
          </DialogContent>
        </div>
      )}
    </div>
  );
}
