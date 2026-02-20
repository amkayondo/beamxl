import { executeFlowsForEvent, type FlowEventContext } from "@/server/services/flow-executor.service";

type FlowExecutionPayload = {
  type: "flow-trigger";
  orgId: string;
  eventContext: FlowEventContext;
  mode: "live" | "dry-run";
};

export async function handleFlowExecutionJob(payload: FlowExecutionPayload) {
  if (payload.type === "flow-trigger") {
    const runIds = await executeFlowsForEvent(payload.eventContext, payload.mode);
    return { runIds };
  }
  return { skipped: true };
}
