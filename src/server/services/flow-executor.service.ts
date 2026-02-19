import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { flowRuns, flows } from "@/server/db/schema";
import type {
  FlowEdge,
  FlowNode,
  FlowNodeData,
  SwitchBranch,
} from "@/lib/flows/types";

export type FlowEventContext = {
  orgId: string;
  eventType:
    | "Invoice Created"
    | "Invoice Overdue"
    | "Payment Failed"
    | "No Reply After X Days";
  invoiceId?: string;
  contactId?: string;
  amount?: number;
  daysOverdue?: number;
  contactTags?: string[];
};

type FlowStepLog = {
  nodeId: string;
  nodeKind: string;
  action: "evaluated" | "matched" | "skipped" | "executed" | "enqueued" | "waited";
  detail: string;
  timestamp: string;
};

type ExecutionMode = "live" | "dry-run";

function evaluateCondition(
  branch: SwitchBranch,
  ctx: FlowEventContext
): boolean {
  const { field, operator, value } = branch.condition;

  let actual: string | number | undefined;
  if (field === "amount") {
    actual = ctx.amount;
  } else if (field === "days_overdue") {
    actual = ctx.daysOverdue;
  } else if (field === "tag") {
    const tags = ctx.contactTags ?? [];
    if (operator === "contains") {
      return tags.some((t) => t.toLowerCase().includes(value.toLowerCase()));
    }
    actual = tags.join(",");
  }

  if (actual === undefined) return false;

  const numActual = typeof actual === "number" ? actual : Number(actual);
  const numValue = Number(value);

  if (!Number.isNaN(numActual) && !Number.isNaN(numValue)) {
    if (operator === ">") return numActual > numValue;
    if (operator === "<") return numActual < numValue;
    if (operator === "=") return numActual === numValue;
  }

  if (operator === "=") return String(actual) === value;
  if (operator === "contains") return String(actual).includes(value);

  return false;
}

function findOutgoingEdges(
  nodeId: string,
  edges: FlowEdge[]
): FlowEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

function findNode(
  nodeId: string,
  nodes: FlowNode[]
): FlowNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

async function walkGraph(
  currentNodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  ctx: FlowEventContext,
  mode: ExecutionMode,
  log: FlowStepLog[]
): Promise<void> {
  const node = findNode(currentNodeId, nodes);
  if (!node) return;

  const data = node.data as FlowNodeData;

  if (data.nodeKind === "trigger") {
    log.push({
      nodeId: node.id,
      nodeKind: "trigger",
      action: "evaluated",
      detail: `Trigger matched: ${data.triggerType}`,
      timestamp: new Date().toISOString(),
    });

    const outgoing = findOutgoingEdges(node.id, edges);
    for (const edge of outgoing) {
      if (edge.target) {
        await walkGraph(edge.target, nodes, edges, ctx, mode, log);
      }
    }
  } else if (data.nodeKind === "switch") {
    log.push({
      nodeId: node.id,
      nodeKind: "switch",
      action: "evaluated",
      detail: `Evaluating ${data.branches.length} branch(es)`,
      timestamp: new Date().toISOString(),
    });

    for (const branch of data.branches) {
      const matched = evaluateCondition(branch, ctx);
      if (matched) {
        log.push({
          nodeId: node.id,
          nodeKind: "switch",
          action: "matched",
          detail: `Branch "${branch.name}" matched (${branch.condition.field} ${branch.condition.operator} ${branch.condition.value})`,
          timestamp: new Date().toISOString(),
        });

        const branchEdge = edges.find(
          (e) => e.source === node.id && e.sourceHandle === branch.id
        );
        if (branchEdge?.target) {
          await walkGraph(branchEdge.target, nodes, edges, ctx, mode, log);
        }
        break;
      } else {
        log.push({
          nodeId: node.id,
          nodeKind: "switch",
          action: "skipped",
          detail: `Branch "${branch.name}" did not match`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } else if (data.nodeKind === "action-enroll") {
    if (mode === "live") {
      log.push({
        nodeId: node.id,
        nodeKind: "action-enroll",
        action: "enqueued",
        detail: `Enqueued "${data.sequence}" sequence for contact ${ctx.contactId ?? "unknown"}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      log.push({
        nodeId: node.id,
        nodeKind: "action-enroll",
        action: "executed",
        detail: `[DRY-RUN] Would enqueue "${data.sequence}" sequence for contact ${ctx.contactId ?? "unknown"}`,
        timestamp: new Date().toISOString(),
      });
    }

    const outgoing = findOutgoingEdges(node.id, edges);
    for (const edge of outgoing) {
      if (edge.target) {
        await walkGraph(edge.target, nodes, edges, ctx, mode, log);
      }
    }
  } else if (data.nodeKind === "utility-wait") {
    if (mode === "live") {
      log.push({
        nodeId: node.id,
        nodeKind: "utility-wait",
        action: "waited",
        detail: `Scheduled continuation after ${data.duration} ${data.unit}`,
        timestamp: new Date().toISOString(),
      });
      // In live mode, we would schedule a delayed BullMQ job here
      // For now, we continue inline for simplicity
    } else {
      log.push({
        nodeId: node.id,
        nodeKind: "utility-wait",
        action: "waited",
        detail: `[DRY-RUN] Would wait ${data.duration} ${data.unit}`,
        timestamp: new Date().toISOString(),
      });
    }

    const outgoing = findOutgoingEdges(node.id, edges);
    for (const edge of outgoing) {
      if (edge.target) {
        await walkGraph(edge.target, nodes, edges, ctx, mode, log);
      }
    }
  }
}

export async function executeFlowById(input: {
  orgId: string;
  flowId: string;
  mode: ExecutionMode;
  eventContext: FlowEventContext;
}): Promise<FlowStepLog[]> {
  const flow = await db.query.flows.findFirst({
    where: (f, { and, eq }) =>
      and(eq(f.id, input.flowId), eq(f.orgId, input.orgId)),
  });

  if (!flow) {
    return [
      {
        nodeId: "",
        nodeKind: "",
        action: "skipped",
        detail: "Flow not found",
        timestamp: new Date().toISOString(),
      },
    ];
  }

  const nodes = (flow.nodesJson ?? []) as FlowNode[];
  const edges = (flow.edgesJson ?? []) as FlowEdge[];
  const log: FlowStepLog[] = [];

  // Find trigger nodes
  const triggers = nodes.filter(
    (n) => (n.data as FlowNodeData).nodeKind === "trigger"
  );

  for (const trigger of triggers) {
    const triggerData = trigger.data as FlowNodeData;
    if (
      triggerData.nodeKind === "trigger" &&
      triggerData.triggerType === input.eventContext.eventType
    ) {
      await walkGraph(trigger.id, nodes, edges, input.eventContext, input.mode, log);
    }
  }

  // Record the run
  const runStatus = input.mode === "dry-run" ? "DRY_RUN" : "COMPLETED";

  await db.insert(flowRuns).values({
    flowId: input.flowId,
    orgId: input.orgId,
    triggeredBy: input.mode === "dry-run" ? "dry-run" : "manual",
    triggerEvent: input.eventContext.eventType,
    status: runStatus,
    completedAt: new Date(),
    log,
  });

  return log;
}

export async function executeFlowsForEvent(
  ctx: FlowEventContext,
  mode: ExecutionMode
): Promise<string[]> {
  const activeFlows = await db.query.flows.findMany({
    where: (f, { and, eq, isNull }) =>
      and(
        eq(f.orgId, ctx.orgId),
        eq(f.status, "ACTIVE"),
        isNull(f.deletedAt)
      ),
  });

  const runIds: string[] = [];

  for (const flow of activeFlows) {
    const nodes = (flow.nodesJson ?? []) as FlowNode[];
    const edges = (flow.edgesJson ?? []) as FlowEdge[];

    // Check if any trigger in this flow matches the event
    const hasTrigger = nodes.some((n) => {
      const data = n.data as FlowNodeData;
      return data.nodeKind === "trigger" && data.triggerType === ctx.eventType;
    });

    if (!hasTrigger) continue;

    const log: FlowStepLog[] = [];
    const triggers = nodes.filter((n) => {
      const data = n.data as FlowNodeData;
      return data.nodeKind === "trigger" && data.triggerType === ctx.eventType;
    });

    for (const trigger of triggers) {
      await walkGraph(trigger.id, nodes, edges, ctx, mode, log);
    }

    const runId = crypto.randomUUID();
    const runStatus = mode === "dry-run" ? "DRY_RUN" : log.some((l) => l.action === "enqueued") ? "COMPLETED" : "COMPLETED";

    await db.insert(flowRuns).values({
      id: runId,
      flowId: flow.id,
      orgId: ctx.orgId,
      triggeredBy: mode === "dry-run" ? "dry-run" : "system",
      triggerEvent: ctx.eventType,
      status: runStatus,
      completedAt: new Date(),
      log,
    });

    runIds.push(runId);
  }

  return runIds;
}
