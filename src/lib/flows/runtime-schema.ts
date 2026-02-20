import { z } from "zod";

import type { FlowEdge, FlowNode } from "@/lib/flows/types";

const runtimeNodeSchema = z.object({
  id: z.string(),
  type: z.string().optional().default("action"),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .catch({ x: 0, y: 0 }),
  data: z
    .record(z.string(), z.unknown())
    .and(z.object({ nodeKind: z.string().optional() }))
    .catch({ nodeKind: "action" }),
});

const runtimeEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  label: z.union([z.string(), z.number()]).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const flowGraphV1Schema = z.object({
  version: z.literal(1),
  nodes: z.array(runtimeNodeSchema),
  edges: z.array(runtimeEdgeSchema),
});

const flowGraphV2Schema = z.object({
  version: z.literal(2),
  nodes: z.array(runtimeNodeSchema),
  edges: z.array(runtimeEdgeSchema),
});

const legacyFlowGraphSchema = z.object({
  nodes: z.array(runtimeNodeSchema),
  edges: z.array(runtimeEdgeSchema),
});

export type RuntimeFlowGraph = {
  version: 1 | 2;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

function adaptLegacyToV1(input: z.infer<typeof legacyFlowGraphSchema>): RuntimeFlowGraph {
  return {
    version: 1,
    nodes: input.nodes as FlowNode[],
    edges: input.edges as FlowEdge[],
  };
}

export function parseRuntimeFlowGraph(input: unknown): RuntimeFlowGraph {
  const v2 = flowGraphV2Schema.safeParse(input);
  if (v2.success) {
    return {
      version: 2,
      nodes: v2.data.nodes as FlowNode[],
      edges: v2.data.edges as FlowEdge[],
    };
  }

  const v1 = flowGraphV1Schema.safeParse(input);
  if (v1.success) {
    return {
      version: 1,
      nodes: v1.data.nodes as FlowNode[],
      edges: v1.data.edges as FlowEdge[],
    };
  }

  const legacy = legacyFlowGraphSchema.safeParse(input);
  if (legacy.success) {
    return adaptLegacyToV1(legacy.data);
  }

  return {
    version: 1,
    nodes: [],
    edges: [],
  };
}
