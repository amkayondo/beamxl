import { pgEnum } from "drizzle-orm/pg-core";

export const orgRoleEnum = pgEnum("org_role", ["OWNER", "ADMIN", "MEMBER"]);
export const orgMemberStatusEnum = pgEnum("org_member_status", [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "DUE",
  "OVERDUE",
  "PAID",
  "FAILED",
  "CANCELED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "INITIATED",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
]);

export const planFrequencyEnum = pgEnum("plan_frequency", [
  "ONE_TIME",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "ACTIVE",
  "PAUSED",
  "CANCELED",
]);

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "BEFORE_DUE",
  "ON_DUE",
  "AFTER_DUE",
  "UNRESPONSIVE",
]);

export const automationChannelEnum = pgEnum("automation_channel", [
  "WHATSAPP",
  "VOICE",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "OUTBOUND",
  "INBOUND",
  "SYSTEM",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "RECEIVED",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "OPEN",
  "PENDING",
  "CLOSED",
]);

export const channelEnum = pgEnum("channel", ["WHATSAPP", "VOICE"]);

export const callStatusEnum = pgEnum("call_status", [
  "QUEUED",
  "RINGING",
  "ANSWERED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "COMPLETED",
]);

export const callOutcomeEnum = pgEnum("call_outcome", [
  "PROMISE_TO_PAY",
  "CALLBACK",
  "VOICEMAIL",
  "FAILED",
  "NO_RESPONSE",
]);

export const providerKindEnum = pgEnum("provider_kind", [
  "PAYMENT",
  "WHATSAPP",
  "CALL",
  "VOICE",
]);

export const languageCodeEnum = pgEnum("language_code", ["EN", "RW", "LG"]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "USER",
  "SYSTEM",
  "WEBHOOK",
]);

export const webhookStatusEnum = pgEnum("webhook_status", [
  "RECEIVED",
  "PROCESSED",
  "FAILED",
]);
