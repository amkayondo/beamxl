import { Queue, type ConnectionOptions } from "bullmq";

import { env } from "@/env";

export const redisConnection: ConnectionOptions = {
  url: env.REDIS_URL ?? "redis://localhost:6379",
  maxRetriesPerRequest: null,
};

export const queueNames = {
  invoiceGeneration: "invoice-generation",
  reminderDispatch: "reminder-dispatch",
  overdueTransition: "overdue-transition",
  receiptDispatch: "receipt-dispatch",
  unresponsiveDetection: "unresponsive-detection",
  voiceEscalation: "voice-escalation",
  flowExecution: "flow-execution",
} as const;

export const invoiceGenerationQueue = new Queue(queueNames.invoiceGeneration, {
  connection: redisConnection,
});

export const reminderDispatchQueue = new Queue(queueNames.reminderDispatch, {
  connection: redisConnection,
});

export const overdueTransitionQueue = new Queue(queueNames.overdueTransition, {
  connection: redisConnection,
});

export const receiptDispatchQueue = new Queue(queueNames.receiptDispatch, {
  connection: redisConnection,
});

export const unresponsiveDetectionQueue = new Queue(
  queueNames.unresponsiveDetection,
  {
    connection: redisConnection,
  }
);

export const voiceEscalationQueue = new Queue(queueNames.voiceEscalation, {
  connection: redisConnection,
});

export const flowExecutionQueue = new Queue(queueNames.flowExecution, {
  connection: redisConnection,
});
