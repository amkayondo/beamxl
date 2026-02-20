"use client";

import { useEffect, useMemo } from "react";
import type { DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";

import { LabeledEdge } from "@/components/flows/custom-edges/labeled-edge";
import { ActionNode } from "@/components/flows/custom-nodes/action-node";
import { SwitchNode } from "@/components/flows/custom-nodes/switch-node";
import { TriggerNode } from "@/components/flows/custom-nodes/trigger-node";
import { WaitNode } from "@/components/flows/custom-nodes/wait-node";
import { FLOW_NODE_DND_MIME } from "@/lib/flows/node-factory";
import type { FlowEdge, FlowNode, FlowNodeKind } from "@/lib/flows/types";

type FlowCanvasProps = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;
  onSelectNode: (nodeId: string | null) => void;
  onDropNode: (kind: FlowNodeKind, position: XYPosition) => void;
  onViewportChange: (viewport: Viewport) => void;
};

export function FlowCanvas(props: FlowCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      switch: SwitchNode,
      "action-enroll": ActionNode,
      "utility-wait": WaitNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      labeled: LabeledEdge,
    }),
    []
  );

  const { screenToFlowPosition, setViewport } = useReactFlow<FlowNode, FlowEdge>();

  useEffect(() => {
    setViewport(props.viewport, { duration: 0 });
  }, [props.viewport, setViewport]);

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const kind = event.dataTransfer.getData(FLOW_NODE_DND_MIME) as FlowNodeKind | "";
    if (!kind) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    props.onDropNode(kind, position);
  }

  return (
    <div className="h-full w-full overflow-hidden bg-zinc-950">
      <ReactFlow
        nodes={props.nodes}
        edges={props.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={props.onNodesChange}
        onEdgesChange={props.onEdgesChange}
        onConnect={props.onConnect}
        onSelectionChange={({ nodes }) => {
          props.onSelectNode(nodes[0]?.id ?? null);
        }}
        onMoveEnd={(_, viewport) => props.onViewportChange(viewport)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={2}
        className="bg-[radial-gradient(circle_at_top,rgba(24,24,27,0.9)_0%,rgba(9,9,11,0.98)_55%)]"
      >
        <MiniMap
          pannable
          zoomable
          className="bg-zinc-900/90!"
          nodeColor="rgba(63,63,70,0.9)"
          maskColor="rgba(2,6,23,0.35)"
        />
        <Controls className="border-zinc-700! bg-zinc-900/90! [&_button]:border-zinc-700! [&_button]:bg-zinc-900! [&_button]:text-zinc-200!" />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="rgba(148, 163, 184, 0.22)" />
      </ReactFlow>
    </div>
  );
}
