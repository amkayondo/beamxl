import { Worker } from "bullmq";

import { queueNames, redisConnection } from "@/server/jobs/queues";
import { handleInvoiceGenerationJob } from "@/server/jobs/handlers/invoice-generation";
import { handleOverdueEscalationJob } from "@/server/jobs/handlers/overdue-escalation";
import { handleReceiptSendJob } from "@/server/jobs/handlers/receipt-send";
import { handleReminderSendJob } from "@/server/jobs/handlers/reminder-send";
import { handleVoiceEscalationJob } from "@/server/jobs/handlers/voice-escalation";

export function createWorkers() {
  const invoiceGenerationWorker = new Worker(
    queueNames.invoiceGeneration,
    async (job) => handleInvoiceGenerationJob(job.data),
    { connection: redisConnection }
  );

  const reminderWorker = new Worker(
    queueNames.reminderDispatch,
    async (job) => handleReminderSendJob(job.data),
    { connection: redisConnection }
  );

  const overdueWorker = new Worker(
    queueNames.overdueTransition,
    async (job) => handleOverdueEscalationJob(job.data),
    { connection: redisConnection }
  );

  const receiptWorker = new Worker(
    queueNames.receiptDispatch,
    async (job) => handleReceiptSendJob(job.data),
    { connection: redisConnection }
  );

  const voiceWorker = new Worker(
    queueNames.voiceEscalation,
    async (job) => handleVoiceEscalationJob(job.data),
    { connection: redisConnection }
  );

  return [
    invoiceGenerationWorker,
    reminderWorker,
    overdueWorker,
    receiptWorker,
    voiceWorker,
  ];
}
