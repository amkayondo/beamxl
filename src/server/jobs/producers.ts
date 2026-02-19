import {
  flowExecutionQueue,
  invoiceGenerationQueue,
  overdueTransitionQueue,
  receiptDispatchQueue,
  reminderDispatchQueue,
  voiceEscalationQueue,
} from "@/server/jobs/queues";
import type { FlowEventContext } from "@/server/services/flow-executor.service";

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 15_000,
  },
  removeOnComplete: 200,
  removeOnFail: 500,
};

export async function enqueueInvoiceGenerationJob(payload: {
  orgId: string;
  paymentPlanId: string;
  periodStart: string;
  periodEnd: string;
}) {
  return invoiceGenerationQueue.add("invoice-generation", payload, {
    jobId: `plan:${payload.paymentPlanId}:${payload.periodStart}:${payload.periodEnd}`,
    ...defaultJobOptions,
  });
}

export async function enqueueReminderJob(payload: {
  orgId: string;
  invoiceId: string;
  templateKey: "FRIENDLY_REMINDER" | "DUE_TODAY" | "LATE_NOTICE" | "FINAL_NOTICE";
  ruleId?: string;
  scheduledAt: string;
}) {
  return reminderDispatchQueue.add("reminder-send", payload, {
    jobId: `invoice:${payload.invoiceId}:rule:${payload.ruleId ?? "manual"}:at:${payload.scheduledAt}`,
    ...defaultJobOptions,
  });
}

export async function enqueueReceiptJob(payload: {
  orgId: string;
  invoiceId: string;
}) {
  return receiptDispatchQueue.add("receipt-send", payload, {
    jobId: `receipt:${payload.invoiceId}`,
    ...defaultJobOptions,
  });
}

export async function enqueueOverdueTransitionJob(payload: {
  orgId: string;
  runDate: string;
}) {
  return overdueTransitionQueue.add("overdue-transition", payload, {
    jobId: `overdue:${payload.orgId}:${payload.runDate}`,
    ...defaultJobOptions,
  });
}

export async function enqueueVoiceEscalationJob(payload: {
  orgId: string;
  invoiceId: string;
}) {
  return voiceEscalationQueue.add("voice-escalation", payload, {
    jobId: `voice:${payload.invoiceId}`,
    ...defaultJobOptions,
  });
}

export async function enqueueFlowTriggerJob(payload: {
  orgId: string;
  eventContext: FlowEventContext;
  mode: "live" | "dry-run";
}) {
  return flowExecutionQueue.add("flow-trigger", { type: "flow-trigger", ...payload }, {
    jobId: `flow:${payload.orgId}:${payload.eventContext.eventType}:${Date.now()}`,
    ...defaultJobOptions,
  });
}
