import { pgEnum } from "drizzle-orm/pg-core";

export const orgRoleEnum = pgEnum("org_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEW_ONLY",
]);
export const orgMemberStatusEnum = pgEnum("org_member_status", [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "DUE",
  "OVERDUE",
  "PARTIAL",
  "PAID",
  "FAILED",
  "CANCELED",
  "CANCELLED",
  "WRITTEN_OFF",
  "IN_DISPUTE",
]);

export const invoiceBundleStatusEnum = pgEnum("invoice_bundle_status", [
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "WEEKLY",
  "MONTHLY",
]);

export const recurringScheduleStatusEnum = pgEnum("recurring_schedule_status", [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
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
  "EMAIL",
  "SMS",
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

export const channelEnum = pgEnum("channel", ["WHATSAPP", "VOICE", "EMAIL", "SMS"]);

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

export const integrationProviderEnum = pgEnum("integration_provider", [
  "stripe",
]);

export const integrationConnectionStatusEnum = pgEnum(
  "integration_connection_status",
  ["connected", "disconnected"]
);

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

export const flowStatusEnum = pgEnum("flow_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
]);

export const flowRunStatusEnum = pgEnum("flow_run_status", [
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "DRY_RUN",
]);

export const consentChannelEnum = pgEnum("consent_channel", [
  "SMS",
  "WHATSAPP",
  "VOICE",
  "EMAIL",
]);

export const consentMethodEnum = pgEnum("consent_method", [
  "WRITTEN",
  "VERBAL",
  "ELECTRONIC",
  "IMPORTED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "PAYMENT_RECEIVED",
  "CONTACT_REPLIED",
  "CONTACT_OPTED_OUT",
  "AUTOMATION_FAILED",
  "FLOW_COMPLETED",
  "IMPORT_COMPLETED",
  "COMPLIANCE_BLOCKED",
]);

export const systemRoleEnum = pgEnum("system_role", ["USER", "ADMIN"]);

export const autopilotModeEnum = pgEnum("autopilot_mode", [
  "MANUAL",
  "GUARDED",
  "FULL",
]);

export const templateApprovalStatusEnum = pgEnum("template_approval_status", [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "LOCKED",
]);

export const billingChannelEnum = pgEnum("billing_channel", [
  "SMS",
  "VOICE",
  "EMAIL",
  "WHATSAPP",
]);

export const subscriptionLifecycleEnum = pgEnum("subscription_lifecycle", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INCOMPLETE",
]);

export const trialLifecycleEnum = pgEnum("trial_lifecycle", [
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "CONVERTED",
  "CANCELED",
]);

export const overageModeEnum = pgEnum("overage_mode", [
  "HARD_STOP",
  "CONTINUE_AND_BILL",
]);

export const topupStatusEnum = pgEnum("topup_status", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
]);

export const workflowStepStatusEnum = pgEnum("workflow_step_status", [
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);

export const approvalDecisionEnum = pgEnum("approval_decision", [
  "PENDING",
  "APPROVED",
  "DENIED",
  "SKIPPED",
  "EXPIRED",
]);

export const abTestStatusEnum = pgEnum("ab_test_status", [
  "DRAFT",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
]);

export const interactiveTypeEnum = pgEnum("interactive_type", [
  "YES_NO",
  "MULTIPLE_CHOICE",
  "NUMERIC_RATING",
  "OPEN_TEXT",
  "SCHEDULE_PICKER",
  "CONSENT_OPT_IN",
]);

export const interactiveStatusEnum = pgEnum("interactive_status", [
  "PENDING",
  "RESPONDED",
  "TIMED_OUT",
  "CANCELED",
]);

export const surveyQuestionTypeEnum = pgEnum("survey_question_type", [
  "TEXT",
  "RATING",
  "MULTIPLE_CHOICE",
  "YES_NO",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const invoiceHealthEnum = pgEnum("invoice_health", [
  "HEALTHY",
  "AT_RISK",
  "CRITICAL",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
  "CANCELLED",
]);

export const legalRiskSeverityEnum = pgEnum("legal_risk_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "MONTHLY_COLLECTION_TARGET",
  "DSO_TARGET",
  "RECOVERY_RATE_TARGET",
  "CLEAR_OVERDUE_BEFORE_DATE",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "ACTIVE",
  "AT_RISK",
  "COMPLETED",
  "PAUSED",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "DRAFT",
  "AWAITING_APPROVAL",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
]);

export const commandStatusEnum = pgEnum("command_status", [
  "RECEIVED",
  "CONFIRMED",
  "EXECUTED",
  "REJECTED",
  "FAILED",
]);

export const portalRequestStatusEnum = pgEnum("portal_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const mobilePlatformEnum = pgEnum("mobile_platform", [
  "IOS",
  "ANDROID",
  "WEB",
]);

export const extensionBrowserEnum = pgEnum("extension_browser", [
  "CHROME",
  "EDGE",
  "BRAVE",
  "ARC",
  "OPERA",
  "OTHER",
]);

export const extensionCaptureSourceEnum = pgEnum("extension_capture_source", [
  "GMAIL",
  "WEBPAGE",
  "MANUAL",
]);

export const extensionCaptureStatusEnum = pgEnum("extension_capture_status", [
  "DRAFT",
  "RESOLVED",
  "APPLIED",
  "FAILED",
]);

export const extensionInstallationStatusEnum = pgEnum("extension_installation_status", [
  "ACTIVE",
  "DISABLED",
]);

export const mobileApprovalActionEnum = pgEnum("mobile_approval_action", [
  "APPROVE",
  "DENY",
  "SNOOZE",
]);
