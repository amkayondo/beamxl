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

const defaultViewport: Viewport = { x: 0, y: 0, zoom: 0.9 };

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
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
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
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Flow Editor</h1>
        <p className="text-sm text-muted-foreground">Loading flow...</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/flows`)}>
              Back
            </Button>
            <Input
              value={flowName}
              onChange={(event) => {
                setFlowName(event.target.value);
                setIsDirty(true);
              }}
              className="h-9 w-64 border-zinc-800 bg-zinc-900 text-zinc-100"
            />
            <Badge className={statusStyles[status]}>{status}</Badge>
            {isDirty ? <Badge className="border-zinc-700 bg-zinc-800 text-zinc-300">Unsaved</Badge> : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestRun}
              disabled={testRunMutation.isPending}
            >
              {testRunMutation.isPending ? "Running..." : "Test"}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <button
              type="button"
              onClick={togglePublish}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium",
                status === "ACTIVE"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200"
              )}
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  status === "ACTIVE" ? "bg-emerald-300" : "bg-zinc-500"
                )}
              />
              Publish
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 lg:hidden">
          <Button type="button" variant="outline" onClick={() => setMobilePaletteOpen(true)}>
            Node Palette
          </Button>
          <Button type="button" variant="outline" onClick={() => setMobileInspectorOpen(true)}>
            Inspector
          </Button>
        </div>

        {notice ? <p className="mt-3 text-xs text-zinc-400">{notice}</p> : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <div className="hidden lg:block">
          <NodePalette />
        </div>

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

        <div className="hidden lg:block">
          <InspectorPanel
            node={selectedNode}
            updateNodeData={updateNodeData}
            updateSwitchBranches={updateSwitchBranches}
          />
        </div>
      </div>

      {testLog ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">Test Run Results (Dry Run)</h3>
            <Button size="sm" variant="ghost" onClick={() => setTestLog(null)}>
              Dismiss
            </Button>
          </div>
          <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {testLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Badge className="shrink-0 border-zinc-700 bg-zinc-800 text-zinc-300">
                  {entry.action}
                </Badge>
                <span className="text-zinc-400">{entry.detail}</span>
              </div>
            ))}
            {testLog.length === 0 ? (
              <p className="text-xs text-zinc-500">No steps executed. Check that the flow has a matching trigger.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {mobilePaletteOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 lg:hidden">
          <div className="h-[80vh] w-full max-w-sm">
            <NodePalette />
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setMobilePaletteOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}

      {mobileInspectorOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 lg:hidden">
          <div className="h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <InspectorPanel
              node={selectedNode}
              updateNodeData={updateNodeData}
              updateSwitchBranches={updateSwitchBranches}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setMobileInspectorOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}

      {pendingDeleteNodeId ? (
        <Dialog>
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
        </Dialog>
      ) : null}
    </section>
  );
}
