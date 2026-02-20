import { and, eq, inArray, isNull } from "drizzle-orm";

import { parseRuntimeFlowGraph } from "@/lib/flows/runtime-schema";
import type { FlowEdge, FlowNode, FlowNodeData, SwitchBranch } from "@/lib/flows/types";
import { db } from "@/server/db";
import { flowRuns, flows, workflowApprovals, workflowRunSteps } from "@/server/db/schema";

export type FlowEventContext = {
  orgId: string;
  eventType:
    | "Invoice Created"
    | "Invoice Overdue"
    | "Payment Failed"
    | "No Reply After X Days"
    | "Client Reply Received"
    | "Manual Trigger"
    | string;
  invoiceId?: string;
  contactId?: string;
  amount?: number;
  daysOverdue?: number;
  contactTags?: string[];
  interactiveResponse?: {
    nodeKey?: string;
    value?: string;
    rawText?: string;
  };
  approvalDecision?: {
    nodeKey?: string;
    decision?: "APPROVED" | "DENIED" | "SKIPPED";
    decisionBody?: string;
  };
};

type FlowStepLog = {
  nodeId: string;
  nodeKind: string;
  action:
    | "evaluated"
    | "matched"
    | "skipped"
    | "executed"
    | "enqueued"
    | "waited"
    | "awaiting_approval"
    | "awaiting_response"
    | "completed";
  detail: string;
  timestamp: string;
};

type ExecutionMode = "live" | "dry-run";

type WalkState = {
  orgId: string;
  runId: string;
  mode: ExecutionMode;
  ctx: FlowEventContext;
  stepIndex: number;
  waiting: boolean;
  log: FlowStepLog[];
  visited: Set<string>;
};

function evaluateCondition(branch: SwitchBranch, ctx: FlowEventContext): boolean {
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

function findOutgoingEdges(nodeId: string, edges: FlowEdge[]) {
  return edges.filter((edge) => edge.source === nodeId);
}

function findNode(nodeId: string, nodes: FlowNode[]) {
  return nodes.find((node) => node.id === nodeId);
}

function getBranchEdge(nodeId: string, edges: FlowEdge[], branchKey?: string | null) {
  if (branchKey) {
    const matchByHandle = edges.find(
      (edge) => edge.source === nodeId && (edge.sourceHandle === branchKey || edge.data?.branchId === branchKey)
    );
    if (matchByHandle) return matchByHandle;
  }

  return edges.find((edge) => edge.source === nodeId && (!edge.sourceHandle || edge.sourceHandle === "default"));
}

function logStep(state: WalkState, entry: Omit<FlowStepLog, "timestamp">) {
  state.log.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

async function persistRunStep(input: {
  orgId: string;
  runId: string;
  nodeKey: string;
  stepIndex: number;
  status: "PENDING" | "RUNNING" | "WAITING_APPROVAL" | "COMPLETED" | "FAILED" | "SKIPPED";
  payload?: Record<string, unknown>;
  error?: string;
}) {
  const stepId = crypto.randomUUID();
  await db.insert(workflowRunSteps).values({
    id: stepId,
    orgId: input.orgId,
    flowRunId: input.runId,
    nodeKey: input.nodeKey,
    stepIndex: input.stepIndex,
    status: input.status,
    payload: input.payload ?? {},
    error: input.error,
    startedAt: new Date(),
    completedAt:
      input.status === "COMPLETED" || input.status === "FAILED" || input.status === "SKIPPED"
        ? new Date()
        : null,
  });

  return stepId;
}

function shouldExecuteTrigger(nodeData: FlowNodeData, ctx: FlowEventContext) {
  if (nodeData.nodeKind !== "trigger") return false;
  return nodeData.triggerType === ctx.eventType;
}

async function walkGraph(
  currentNodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  state: WalkState
): Promise<void> {
  const node = findNode(currentNodeId, nodes);
  if (!node) return;

  const visitKey = `${currentNodeId}:${state.stepIndex}`;
  if (state.visited.has(visitKey)) {
    return;
  }
  state.visited.add(visitKey);

  const data = node.data as FlowNodeData;
  state.stepIndex += 1;
  const stepIndex = state.stepIndex;

  if (data.nodeKind === "trigger") {
    await persistRunStep({
      orgId: state.orgId,
      runId: state.runId,
      nodeKey: node.id,
      stepIndex,
      status: "COMPLETED",
      payload: {
        triggerType: data.triggerType,
      },
    });

    logStep(state, {
      nodeId: node.id,
      nodeKind: "trigger",
      action: "evaluated",
      detail: `Trigger matched: ${data.triggerType}`,
    });

    const outgoing = findOutgoingEdges(node.id, edges);
    for (const edge of outgoing) {
      if (edge.target) {
        await walkGraph(edge.target, nodes, edges, state);
      }
    }
    return;
  }

  if (data.nodeKind === "switch" || data.nodeKind === "condition") {
    const branches = data.nodeKind === "switch" ? data.branches : ((data.branches ?? []) as SwitchBranch[]);

    logStep(state, {
      nodeId: node.id,
      nodeKind: data.nodeKind,
      action: "evaluated",
      detail: `Evaluating ${branches.length} branch(es)`,
    });

    let selectedBranchId: string | null = null;

    for (const branch of branches) {
      if (evaluateCondition(branch, state.ctx)) {
        selectedBranchId = branch.id;
        logStep(state, {
          nodeId: node.id,
          nodeKind: data.nodeKind,
          action: "matched",
          detail: `Branch \"${branch.name}\" matched`,
        });
        break;
      }

      logStep(state, {
        nodeId: node.id,
        nodeKind: data.nodeKind,
        action: "skipped",
        detail: `Branch \"${branch.name}\" did not match`,
      });
    }

    await persistRunStep({
      orgId: state.orgId,
      runId: state.runId,
      nodeKey: node.id,
      stepIndex,
      status: selectedBranchId ? "COMPLETED" : "SKIPPED",
      payload: {
        branchesCount: branches.length,
        selectedBranchId,
      },
    });

    const selectedEdge = getBranchEdge(node.id, edges, selectedBranchId);
    if (selectedEdge?.target) {
      await walkGraph(selectedEdge.target, nodes, edges, state);
    }
    return;
  }

  if (data.nodeKind === "approval") {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const stepId = await persistRunStep({
      orgId: state.orgId,
      runId: state.runId,
      nodeKey: node.id,
      stepIndex,
      status: "WAITING_APPROVAL",
      payload: {
        expiresAt: expiresAt.toISOString(),
      },
    });

    await db.insert(workflowApprovals).values({
      id: crypto.randomUUID(),
      orgId: state.orgId,
      flowRunStepId: stepId,
      requestedChannel: String(data.requestedChannel ?? "IN_APP"),
      requestBody: String(data.requestBody ?? data.title ?? "Approval required"),
      decision: "PENDING",
      expiresAt,
    });

    logStep(state, {
      nodeId: node.id,
      nodeKind: "approval",
      action: "awaiting_approval",
      detail: "Waiting for owner approval",
    });

    state.waiting = true;
    return;
  }

  if (data.nodeKind === "interactive") {
    const expectedNodeKey = state.ctx.interactiveResponse?.nodeKey;
    const hasResponse = !!state.ctx.interactiveResponse && (!expectedNodeKey || expectedNodeKey === node.id);

    if (!hasResponse) {
      await persistRunStep({
        orgId: state.orgId,
        runId: state.runId,
        nodeKey: node.id,
        stepIndex,
        status: "PENDING",
        payload: {
          waitingFor: "interactive_response",
        },
      });

      logStep(state, {
        nodeId: node.id,
        nodeKind: "interactive",
        action: "awaiting_response",
        detail: "Waiting for interactive response",
      });

      state.waiting = true;
      return;
    }

    const responseValue = state.ctx.interactiveResponse?.value ?? state.ctx.interactiveResponse?.rawText ?? "";
    const nextBranch = String(data.responseBranchMap?.[responseValue] ?? data.defaultBranch ?? "");

    await persistRunStep({
      orgId: state.orgId,
      runId: state.runId,
      nodeKey: node.id,
      stepIndex,
      status: "COMPLETED",
      payload: {
        responseValue,
        nextBranch,
      },
    });

    logStep(state, {
      nodeId: node.id,
      nodeKind: "interactive",
      action: "matched",
      detail: `Interactive response routed to ${nextBranch || "default"}`,
    });

    const edge = getBranchEdge(node.id, edges, nextBranch || null);
    if (edge?.target) {
      await walkGraph(edge.target, nodes, edges, state);
    }
    return;
  }

  if (data.nodeKind === "utility-wait" || data.nodeKind === "wait") {
    await persistRunStep({
      orgId: state.orgId,
      runId: state.runId,
      nodeKey: node.id,
      stepIndex,
      status: state.mode === "live" ? "PENDING" : "COMPLETED",
      payload: {
        duration: data.duration ?? 0,
        unit: data.unit ?? "hours",
      },
    });

    logStep(state, {
      nodeId: node.id,
      nodeKind: data.nodeKind,
      action: "waited",
      detail:
        state.mode === "live"
          ? `Scheduled continuation after ${String(data.duration ?? 0)} ${String(data.unit ?? "hours")}`
          : `[DRY-RUN] Would wait ${String(data.duration ?? 0)} ${String(data.unit ?? "hours")}`,
    });

    if (state.mode === "live") {
      state.waiting = true;
      return;
    }

    const outgoing = findOutgoingEdges(node.id, edges);
    for (const edge of outgoing) {
      if (edge.target) {
        await walkGraph(edge.target, nodes, edges, state);
      }
    }
    return;
  }

  if (data.nodeKind === "exit") {
    await persistRunStep({
      orgId: state.orgId,
      runId: state.runId,
      nodeKey: node.id,
      stepIndex,
      status: "COMPLETED",
      payload: {
        reason: String(data.reason ?? "EXIT"),
      },
    });

    logStep(state, {
      nodeId: node.id,
      nodeKind: "exit",
      action: "completed",
      detail: String(data.reason ?? "Exit condition met"),
    });
    return;
  }

  const actionKind = data.nodeKind === "action-enroll" ? "action-enroll" : "action";

  await persistRunStep({
    orgId: state.orgId,
    runId: state.runId,
    nodeKey: node.id,
    stepIndex,
    status: "COMPLETED",
    payload: {
      sequence: (data as any).sequence,
      actionType: (data as any).actionType,
    },
  });

  logStep(state, {
    nodeId: node.id,
    nodeKind: actionKind,
    action: state.mode === "live" ? "enqueued" : "executed",
    detail:
      state.mode === "live"
        ? `Action scheduled for contact ${state.ctx.contactId ?? "unknown"}`
        : `[DRY-RUN] Action would execute for contact ${state.ctx.contactId ?? "unknown"}`,
  });

  const outgoing = findOutgoingEdges(node.id, edges);
  for (const edge of outgoing) {
    if (edge.target) {
      await walkGraph(edge.target, nodes, edges, state);
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
    where: (f, { and, eq }) => and(eq(f.id, input.flowId), eq(f.orgId, input.orgId)),
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

  const parsedGraph = parseRuntimeFlowGraph({
    nodes: flow.nodesJson ?? [],
    edges: flow.edgesJson ?? [],
  });
  const nodes = parsedGraph.nodes;
  const edges = parsedGraph.edges;

  const runId = crypto.randomUUID();
  await db.insert(flowRuns).values({
    id: runId,
    flowId: input.flowId,
    orgId: input.orgId,
    triggeredBy: input.mode === "dry-run" ? "dry-run" : "manual",
    triggerEvent: input.eventContext.eventType,
    status: input.mode === "dry-run" ? "DRY_RUN" : "RUNNING",
  });

  const state: WalkState = {
    orgId: input.orgId,
    runId,
    mode: input.mode,
    ctx: input.eventContext,
    stepIndex: 0,
    waiting: false,
    log: [],
    visited: new Set<string>(),
  };

  const triggers = nodes.filter((n) => shouldExecuteTrigger(n.data as FlowNodeData, input.eventContext));

  for (const trigger of triggers) {
    await walkGraph(trigger.id, nodes, edges, state);
  }

  const runStatus =
    input.mode === "dry-run" ? "DRY_RUN" : state.waiting ? "RUNNING" : "COMPLETED";

  await db
    .update(flowRuns)
    .set({
      status: runStatus,
      completedAt: runStatus === "COMPLETED" || runStatus === "DRY_RUN" ? new Date() : null,
      log: state.log,
    })
    .where(eq(flowRuns.id, runId));

  return state.log;
}

export async function executeFlowsForEvent(ctx: FlowEventContext, mode: ExecutionMode): Promise<string[]> {
  const activeFlows = await db.query.flows.findMany({
    where: (f, { and, eq, isNull }) => and(eq(f.orgId, ctx.orgId), eq(f.status, "ACTIVE"), isNull(f.deletedAt)),
  });

  const runIds: string[] = [];

  for (const flow of activeFlows) {
    const parsedGraph = parseRuntimeFlowGraph({
      nodes: flow.nodesJson ?? [],
      edges: flow.edgesJson ?? [],
    });

    const hasTrigger = parsedGraph.nodes.some((node) =>
      shouldExecuteTrigger(node.data as FlowNodeData, ctx)
    );

    if (!hasTrigger) continue;

    const runId = crypto.randomUUID();
    await db.insert(flowRuns).values({
      id: runId,
      flowId: flow.id,
      orgId: ctx.orgId,
      triggeredBy: mode === "dry-run" ? "dry-run" : "system",
      triggerEvent: ctx.eventType,
      status: mode === "dry-run" ? "DRY_RUN" : "RUNNING",
    });

    const state: WalkState = {
      orgId: ctx.orgId,
      runId,
      mode,
      ctx,
      stepIndex: 0,
      waiting: false,
      log: [],
      visited: new Set<string>(),
    };

    const triggers = parsedGraph.nodes.filter((node) =>
      shouldExecuteTrigger(node.data as FlowNodeData, ctx)
    );

    for (const trigger of triggers) {
      await walkGraph(trigger.id, parsedGraph.nodes, parsedGraph.edges, state);
    }

    const finalStatus = mode === "dry-run" ? "DRY_RUN" : state.waiting ? "RUNNING" : "COMPLETED";

    await db
      .update(flowRuns)
      .set({
        status: finalStatus,
        completedAt: finalStatus === "COMPLETED" || finalStatus === "DRY_RUN" ? new Date() : null,
        log: state.log,
      })
      .where(and(eq(flowRuns.id, runId), eq(flowRuns.orgId, ctx.orgId)));

    runIds.push(runId);
  }

  return runIds;
}

export async function listFlowPendingApprovals(input: {
  orgId: string;
  flowRunId: string;
}) {
  const stepRows = await db
    .select({ id: workflowRunSteps.id })
    .from(workflowRunSteps)
    .where(and(eq(workflowRunSteps.orgId, input.orgId), eq(workflowRunSteps.flowRunId, input.flowRunId)));

  const stepIds = stepRows.map((row) => row.id);
  if (stepIds.length === 0) return [];

  return db.query.workflowApprovals.findMany({
    where: (a, { and, eq, inArray }) =>
      and(eq(a.orgId, input.orgId), inArray(a.flowRunStepId, stepIds)),
  });
}
