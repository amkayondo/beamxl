import {
  flowExecutionQueue,
  invoiceGenerationQueue,
  overdueTransitionQueue,
  receiptDispatchQueue,
  reminderDispatchQueue,
  trialDripQueue,
  voiceEscalationQueue,
} from "@/server/jobs/queues";
import type { FlowEventContext } from "@/server/services/flow-executor.service";

type TrialDripPayload = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  dayNumber: 0 | 3 | 7 | 12 | 14;
};

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

/** Schedule all 5 trial drip emails for a newly created org. */
export async function enqueueTrialDripJobs(payload: {
  orgId: string;
  orgName: string;
  orgSlug: string;
}): Promise<void> {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const schedule: { day: TrialDripPayload["dayNumber"]; delayMs: number }[] = [
    { day: 0,  delayMs: 0 },
    { day: 3,  delayMs: 3  * MS_PER_DAY },
    { day: 7,  delayMs: 7  * MS_PER_DAY },
    { day: 12, delayMs: 12 * MS_PER_DAY },
    { day: 14, delayMs: 14 * MS_PER_DAY },
  ];

  await Promise.all(
    schedule.map(({ day, delayMs }) =>
      trialDripQueue.add(
        "trial-drip",
        { ...payload, dayNumber: day } satisfies TrialDripPayload,
        {
          jobId: `trial:${payload.orgId}:day:${day}`,
          delay: delayMs,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        }
      )
    )
  );
}
