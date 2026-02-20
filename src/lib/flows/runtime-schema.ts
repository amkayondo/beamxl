import { z } from "zod";

import type { FlowEdge, FlowNode } from "@/lib/flows/types";

const flowNodeKindSchema = z.enum(["trigger", "switch", "action-enroll", "utility-wait"]);

const triggerDataSchema = z.object({
  nodeKind: z.literal("trigger"),
  chip: z.literal("Trigger"),
  title: z.string(),
  subtitle: z.string(),
  runtime: z.enum(["Completed", "Running", "Idle"]),
  triggerType: z.enum([
    "Invoice Created",
    "Invoice Overdue",
    "Payment Failed",
    "No Reply After X Days",
  ]),
  filters: z.object({
    tag: z.string(),
    language: z.enum(["ANY", "EN", "RW", "LG"]),
  }),
});

const switchDataSchema = z.object({
  nodeKind: z.literal("switch"),
  chip: z.literal("Condition"),
  title: z.string(),
  subtitle: z.string(),
  runtime: z.enum(["Completed", "Running", "Idle"]),
  branches: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      condition: z.object({
        field: z.enum(["amount", "days_overdue", "tag"]),
        operator: z.enum([">", "<", "=", "contains"]),
        value: z.string(),
      }),
    })
  ),
});

const actionDataSchema = z.object({
  nodeKind: z.literal("action-enroll"),
  chip: z.literal("Action"),
  title: z.string(),
  subtitle: z.string(),
  runtime: z.enum(["Completed", "Running", "Idle"]),
  sequence: z.enum(["Nurture", "Upsell", "Follow-up"]),
  messagePreview: z.string(),
});

const waitDataSchema = z.object({
  nodeKind: z.literal("utility-wait"),
  chip: z.literal("Utility"),
  title: z.string(),
  subtitle: z.string(),
  runtime: z.enum(["Completed", "Running", "Idle"]),
  duration: z.number(),
  unit: z.enum(["hours", "days"]),
});

const flowNodeSchema = z.object({
  id: z.string(),
  type: flowNodeKindSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.union([triggerDataSchema, switchDataSchema, actionDataSchema, waitDataSchema]),
});

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  data: z.object({ branchId: z.string().optional() }).optional(),
});

const flowGraphV1Schema = z.object({
  version: z.literal(1),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

const legacyFlowGraphSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

export type RuntimeFlowGraph = {
  version: 1;
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
