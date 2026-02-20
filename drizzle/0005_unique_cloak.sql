CREATE TYPE "public"."ab_test_status" AS ENUM('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('PENDING', 'APPROVED', 'DENIED', 'SKIPPED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."autopilot_mode" AS ENUM('MANUAL', 'GUARDED', 'FULL');--> statement-breakpoint
CREATE TYPE "public"."billing_channel" AS ENUM('SMS', 'VOICE', 'EMAIL', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."command_status" AS ENUM('RECEIVED', 'CONFIRMED', 'EXECUTED', 'REJECTED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('ACTIVE', 'AT_RISK', 'COMPLETED', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('MONTHLY_COLLECTION_TARGET', 'DSO_TARGET', 'RECOVERY_RATE_TARGET', 'CLEAR_OVERDUE_BEFORE_DATE');--> statement-breakpoint
CREATE TYPE "public"."interactive_status" AS ENUM('PENDING', 'RESPONDED', 'TIMED_OUT', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."interactive_type" AS ENUM('YES_NO', 'MULTIPLE_CHOICE', 'NUMERIC_RATING', 'OPEN_TEXT', 'SCHEDULE_PICKER', 'CONSENT_OPT_IN');--> statement-breakpoint
CREATE TYPE "public"."invoice_health" AS ENUM('HEALTHY', 'AT_RISK', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."legal_risk_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."overage_mode" AS ENUM('HARD_STOP', 'CONTINUE_AND_BILL');--> statement-breakpoint
CREATE TYPE "public"."portal_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."subscription_lifecycle" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');--> statement-breakpoint
CREATE TYPE "public"."survey_question_type" AS ENUM('TEXT', 'RATING', 'MULTIPLE_CHOICE', 'YES_NO');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('DRAFT', 'AWAITING_APPROVAL', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."template_approval_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."topup_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."trial_lifecycle" AS ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_status" AS ENUM('PENDING', 'RUNNING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'SKIPPED');--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'VIEWED' BEFORE 'DUE';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'PARTIAL' BEFORE 'PAID';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'WRITTEN_OFF';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'IN_DISPUTE';--> statement-breakpoint
ALTER TYPE "public"."org_role" ADD VALUE 'VIEW_ONLY';--> statement-breakpoint
CREATE TABLE "beamflow_credit_topups" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"pack_code" text NOT NULL,
	"sms_credits" integer DEFAULT 0 NOT NULL,
	"email_credits" integer DEFAULT 0 NOT NULL,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"whatsapp_credits" integer DEFAULT 0 NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"stripe_payment_intent_id" text,
	"status" "topup_status" DEFAULT 'PENDING' NOT NULL,
	"purchased_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_org_plan_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_lifecycle" DEFAULT 'TRIALING' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_starts_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_overage_caps" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"mode" "overage_mode" DEFAULT 'HARD_STOP' NOT NULL,
	"cap_minor" integer DEFAULT 0 NOT NULL,
	"threshold_10_enabled" boolean DEFAULT true NOT NULL,
	"threshold_25_enabled" boolean DEFAULT true NOT NULL,
	"threshold_50_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_overage_caps_org_uq" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_overage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"channel" "billing_channel" NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	"amount_minor" integer DEFAULT 0 NOT NULL,
	"threshold_minor" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_plan_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"monthly_price_minor" integer NOT NULL,
	"invoices_limit" integer,
	"sms_credits" integer DEFAULT 0 NOT NULL,
	"email_credits" integer DEFAULT 0 NOT NULL,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"users_limit" integer,
	"workflows_limit" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_plan_catalog_code_uq" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "beamflow_trial_state" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"status" "trial_lifecycle" DEFAULT 'PENDING' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"requires_card_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"converted_plan_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_trial_state_org_uq" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_usage_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"cycle_start" timestamp with time zone NOT NULL,
	"cycle_end" timestamp with time zone NOT NULL,
	"sms_used" integer DEFAULT 0 NOT NULL,
	"sms_included" integer DEFAULT 0 NOT NULL,
	"email_used" integer DEFAULT 0 NOT NULL,
	"email_included" integer DEFAULT 0 NOT NULL,
	"voice_seconds_used" integer DEFAULT 0 NOT NULL,
	"voice_seconds_included" integer DEFAULT 0 NOT NULL,
	"whatsapp_used" integer DEFAULT 0 NOT NULL,
	"whatsapp_included" integer DEFAULT 0 NOT NULL,
	"overage_mode" "overage_mode" DEFAULT 'HARD_STOP' NOT NULL,
	"overage_cap_minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_usage_credits_org_cycle_uq" UNIQUE("org_id","cycle_start","cycle_end")
);
--> statement-breakpoint
CREATE TABLE "beamflow_workflow_ab_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"name" text NOT NULL,
	"variant_a" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"variant_b" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"winner" text,
	"status" "ab_test_status" DEFAULT 'DRAFT' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_workflow_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"flow_run_step_id" text NOT NULL,
	"requested_channel" text DEFAULT 'IN_APP' NOT NULL,
	"request_body" text NOT NULL,
	"decision" "approval_decision" DEFAULT 'PENDING' NOT NULL,
	"decision_body" text,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_workflow_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"version_id" text NOT NULL,
	"edge_key" text NOT NULL,
	"source_node_key" text NOT NULL,
	"source_handle" text,
	"target_node_key" text NOT NULL,
	"target_handle" text,
	"condition_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_workflow_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"version_id" text NOT NULL,
	"node_key" text NOT NULL,
	"node_type" text NOT NULL,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_workflow_run_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"flow_run_id" text NOT NULL,
	"node_key" text NOT NULL,
	"step_index" integer NOT NULL,
	"status" "workflow_step_status" DEFAULT 'PENDING' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_workflow_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"nodes_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_interactive_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"conversation_id" text,
	"invoice_id" text,
	"workflow_node_id" text,
	"channel" "channel" DEFAULT 'WHATSAPP' NOT NULL,
	"type" "interactive_type" NOT NULL,
	"prompt" text NOT NULL,
	"status" "interactive_status" DEFAULT 'PENDING' NOT NULL,
	"expected_by" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"routed_branch" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_interactive_options" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"interactive_message_id" text NOT NULL,
	"option_key" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"branch_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_interactive_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"interactive_message_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"raw_text" text,
	"normalized_value" text,
	"detected_intent" text,
	"sentiment_score" double precision,
	"routed_branch" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_survey_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"survey_id" text NOT NULL,
	"question_type" "survey_question_type" NOT NULL,
	"prompt" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_survey_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"survey_id" text NOT NULL,
	"question_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"invoice_id" text,
	"answer_text" text,
	"answer_numeric" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"channel" "channel" DEFAULT 'EMAIL' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_channel_effectiveness_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"day" date NOT NULL,
	"channel" "billing_channel" NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"paid_count" integer DEFAULT 0 NOT NULL,
	"collected_minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_channel_effectiveness_org_day_channel_uq" UNIQUE("org_id","day","channel")
);
--> statement-breakpoint
CREATE TABLE "beamflow_client_risk_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"score" integer NOT NULL,
	"factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_client_risk_scores_org_contact_computed_uq" UNIQUE("org_id","contact_id","computed_at")
);
--> statement-breakpoint
CREATE TABLE "beamflow_forecast_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"horizon_days" integer NOT NULL,
	"projected_collections_minor" integer NOT NULL,
	"at_risk_minor" integer DEFAULT 0 NOT NULL,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_invoice_health_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"health" "invoice_health" NOT NULL,
	"score" integer NOT NULL,
	"predicted_paid_at" timestamp with time zone,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_invoice_health_scores_org_invoice_computed_uq" UNIQUE("org_id","invoice_id","computed_at")
);
--> statement-breakpoint
CREATE TABLE "beamflow_chargeback_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text,
	"payment_id" text,
	"provider_event_id" text NOT NULL,
	"status" text NOT NULL,
	"amount_minor" integer,
	"currency" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_dispute_events" (
	"id" text PRIMARY KEY NOT NULL,
	"dispute_id" text NOT NULL,
	"org_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" text DEFAULT 'SYSTEM' NOT NULL,
	"actor_user_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text,
	"resolution_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_legal_risk_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text,
	"contact_id" text,
	"source" text NOT NULL,
	"severity" "legal_risk_severity" DEFAULT 'MEDIUM' NOT NULL,
	"trigger_text" text,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_agent_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"flow_run_id" text,
	"invoice_id" text,
	"contact_id" text,
	"decision_type" text NOT NULL,
	"reason" text NOT NULL,
	"policy_checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_provider" text,
	"model_name" text,
	"trace_id" text,
	"overridden_by_user_id" text,
	"overridden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_agent_goal_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"org_id" text NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"value_amount_minor" integer,
	"value_percent" integer,
	"value_days" integer,
	"is_on_track" boolean DEFAULT true NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "beamflow_agent_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"goal_type" "goal_type" NOT NULL,
	"name" text NOT NULL,
	"target_amount_minor" integer,
	"target_percent" integer,
	"target_days" integer,
	"target_date" date,
	"status" "goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_agent_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_by_user_id" text,
	"source_channel" "channel" DEFAULT 'WHATSAPP' NOT NULL,
	"prompt" text NOT NULL,
	"normalized_intent" text,
	"execution_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "task_status" DEFAULT 'DRAFT' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"agent_task_id" text,
	"flow_run_id" text,
	"channel" "channel" DEFAULT 'WHATSAPP' NOT NULL,
	"request_text" text NOT NULL,
	"status" "command_status" DEFAULT 'RECEIVED' NOT NULL,
	"decision_text" text,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_owner_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"channel" "channel" DEFAULT 'WHATSAPP' NOT NULL,
	"command_text" text NOT NULL,
	"parsed_intent" text,
	"status" "command_status" DEFAULT 'RECEIVED' NOT NULL,
	"response_text" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_client_portal_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"access_token_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_client_portal_accounts_org_contact_uq" UNIQUE("org_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_client_portal_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"portal_account_id" text NOT NULL,
	"session_token_hash" text NOT NULL,
	"ip_hash" text,
	"user_agent_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_payment_plan_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"requested_amount_minor" integer,
	"requested_installments" integer,
	"preferred_day_of_month" integer,
	"notes" text,
	"status" "portal_request_status" DEFAULT 'PENDING' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "beamflow_portal_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"allow_sms" boolean DEFAULT true NOT NULL,
	"allow_email" boolean DEFAULT true NOT NULL,
	"allow_whatsapp" boolean DEFAULT true NOT NULL,
	"allow_voice" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_portal_preferences_org_contact_uq" UNIQUE("org_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_integration_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_type" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"external_account_id" text,
	"auth_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_integration_connections_org_provider_uq" UNIQUE("org_id","provider")
);
--> statement-breakpoint
CREATE TABLE "beamflow_integration_sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"integration_connection_id" text NOT NULL,
	"direction" text DEFAULT 'PULL' NOT NULL,
	"entity_type" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "mission_briefing" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "autopilot_mode" "autopilot_mode" DEFAULT 'GUARDED' NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "owner_alert_channel" text DEFAULT 'EMAIL' NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "owner_digest_frequency" text DEFAULT 'DAILY' NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "approval_status" "template_approval_status" DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "compliance_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "approved_by_user_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "beamflow_credit_topups" ADD CONSTRAINT "beamflow_credit_topups_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_org_plan_subscriptions" ADD CONSTRAINT "beamflow_org_plan_subscriptions_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_org_plan_subscriptions" ADD CONSTRAINT "beamflow_org_plan_subscriptions_plan_id_beamflow_plan_catalog_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."beamflow_plan_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_overage_caps" ADD CONSTRAINT "beamflow_overage_caps_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_overage_events" ADD CONSTRAINT "beamflow_overage_events_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_trial_state" ADD CONSTRAINT "beamflow_trial_state_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_usage_credits" ADD CONSTRAINT "beamflow_usage_credits_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_ab_tests" ADD CONSTRAINT "beamflow_workflow_ab_tests_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_ab_tests" ADD CONSTRAINT "beamflow_workflow_ab_tests_flow_id_beamflow_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."beamflow_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_approvals" ADD CONSTRAINT "beamflow_workflow_approvals_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_approvals" ADD CONSTRAINT "beamflow_workflow_approvals_flow_run_step_id_beamflow_workflow_run_steps_id_fk" FOREIGN KEY ("flow_run_step_id") REFERENCES "public"."beamflow_workflow_run_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_approvals" ADD CONSTRAINT "beamflow_workflow_approvals_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_edges" ADD CONSTRAINT "beamflow_workflow_edges_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_edges" ADD CONSTRAINT "beamflow_workflow_edges_version_id_beamflow_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."beamflow_workflow_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_nodes" ADD CONSTRAINT "beamflow_workflow_nodes_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_nodes" ADD CONSTRAINT "beamflow_workflow_nodes_version_id_beamflow_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."beamflow_workflow_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_run_steps" ADD CONSTRAINT "beamflow_workflow_run_steps_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_run_steps" ADD CONSTRAINT "beamflow_workflow_run_steps_flow_run_id_beamflow_flow_runs_id_fk" FOREIGN KEY ("flow_run_id") REFERENCES "public"."beamflow_flow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_versions" ADD CONSTRAINT "beamflow_workflow_versions_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_versions" ADD CONSTRAINT "beamflow_workflow_versions_flow_id_beamflow_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."beamflow_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_workflow_versions" ADD CONSTRAINT "beamflow_workflow_versions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_messages" ADD CONSTRAINT "beamflow_interactive_messages_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_messages" ADD CONSTRAINT "beamflow_interactive_messages_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_messages" ADD CONSTRAINT "beamflow_interactive_messages_conversation_id_beamflow_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."beamflow_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_messages" ADD CONSTRAINT "beamflow_interactive_messages_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_options" ADD CONSTRAINT "beamflow_interactive_options_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_options" ADD CONSTRAINT "beamflow_interactive_options_interactive_message_id_beamflow_interactive_messages_id_fk" FOREIGN KEY ("interactive_message_id") REFERENCES "public"."beamflow_interactive_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_responses" ADD CONSTRAINT "beamflow_interactive_responses_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_responses" ADD CONSTRAINT "beamflow_interactive_responses_interactive_message_id_beamflow_interactive_messages_id_fk" FOREIGN KEY ("interactive_message_id") REFERENCES "public"."beamflow_interactive_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_interactive_responses" ADD CONSTRAINT "beamflow_interactive_responses_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_questions" ADD CONSTRAINT "beamflow_survey_questions_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_questions" ADD CONSTRAINT "beamflow_survey_questions_survey_id_beamflow_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."beamflow_surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_responses" ADD CONSTRAINT "beamflow_survey_responses_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_responses" ADD CONSTRAINT "beamflow_survey_responses_survey_id_beamflow_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."beamflow_surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_responses" ADD CONSTRAINT "beamflow_survey_responses_question_id_beamflow_survey_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."beamflow_survey_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_responses" ADD CONSTRAINT "beamflow_survey_responses_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_survey_responses" ADD CONSTRAINT "beamflow_survey_responses_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_surveys" ADD CONSTRAINT "beamflow_surveys_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_surveys" ADD CONSTRAINT "beamflow_surveys_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_channel_effectiveness_daily" ADD CONSTRAINT "beamflow_channel_effectiveness_daily_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_client_risk_scores" ADD CONSTRAINT "beamflow_client_risk_scores_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_client_risk_scores" ADD CONSTRAINT "beamflow_client_risk_scores_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_forecast_snapshots" ADD CONSTRAINT "beamflow_forecast_snapshots_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_health_scores" ADD CONSTRAINT "beamflow_invoice_health_scores_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_health_scores" ADD CONSTRAINT "beamflow_invoice_health_scores_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_chargeback_events" ADD CONSTRAINT "beamflow_chargeback_events_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_chargeback_events" ADD CONSTRAINT "beamflow_chargeback_events_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_chargeback_events" ADD CONSTRAINT "beamflow_chargeback_events_payment_id_beamflow_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."beamflow_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_dispute_events" ADD CONSTRAINT "beamflow_dispute_events_dispute_id_beamflow_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."beamflow_disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_dispute_events" ADD CONSTRAINT "beamflow_dispute_events_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_dispute_events" ADD CONSTRAINT "beamflow_dispute_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_disputes" ADD CONSTRAINT "beamflow_disputes_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_disputes" ADD CONSTRAINT "beamflow_disputes_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_disputes" ADD CONSTRAINT "beamflow_disputes_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_disputes" ADD CONSTRAINT "beamflow_disputes_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_legal_risk_flags" ADD CONSTRAINT "beamflow_legal_risk_flags_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_legal_risk_flags" ADD CONSTRAINT "beamflow_legal_risk_flags_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_legal_risk_flags" ADD CONSTRAINT "beamflow_legal_risk_flags_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_legal_risk_flags" ADD CONSTRAINT "beamflow_legal_risk_flags_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_decisions" ADD CONSTRAINT "beamflow_agent_decisions_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_decisions" ADD CONSTRAINT "beamflow_agent_decisions_flow_run_id_beamflow_flow_runs_id_fk" FOREIGN KEY ("flow_run_id") REFERENCES "public"."beamflow_flow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_decisions" ADD CONSTRAINT "beamflow_agent_decisions_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_decisions" ADD CONSTRAINT "beamflow_agent_decisions_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_decisions" ADD CONSTRAINT "beamflow_agent_decisions_overridden_by_user_id_user_id_fk" FOREIGN KEY ("overridden_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_goal_progress" ADD CONSTRAINT "beamflow_agent_goal_progress_goal_id_beamflow_agent_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."beamflow_agent_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_goal_progress" ADD CONSTRAINT "beamflow_agent_goal_progress_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_goals" ADD CONSTRAINT "beamflow_agent_goals_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_goals" ADD CONSTRAINT "beamflow_agent_goals_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_tasks" ADD CONSTRAINT "beamflow_agent_tasks_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_agent_tasks" ADD CONSTRAINT "beamflow_agent_tasks_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_approval_requests" ADD CONSTRAINT "beamflow_approval_requests_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_approval_requests" ADD CONSTRAINT "beamflow_approval_requests_agent_task_id_beamflow_agent_tasks_id_fk" FOREIGN KEY ("agent_task_id") REFERENCES "public"."beamflow_agent_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_approval_requests" ADD CONSTRAINT "beamflow_approval_requests_flow_run_id_beamflow_flow_runs_id_fk" FOREIGN KEY ("flow_run_id") REFERENCES "public"."beamflow_flow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_approval_requests" ADD CONSTRAINT "beamflow_approval_requests_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_owner_commands" ADD CONSTRAINT "beamflow_owner_commands_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_owner_commands" ADD CONSTRAINT "beamflow_owner_commands_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_client_portal_accounts" ADD CONSTRAINT "beamflow_client_portal_accounts_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_client_portal_accounts" ADD CONSTRAINT "beamflow_client_portal_accounts_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_client_portal_sessions" ADD CONSTRAINT "beamflow_client_portal_sessions_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_client_portal_sessions" ADD CONSTRAINT "beamflow_client_portal_sessions_portal_account_id_beamflow_client_portal_accounts_id_fk" FOREIGN KEY ("portal_account_id") REFERENCES "public"."beamflow_client_portal_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payment_plan_requests" ADD CONSTRAINT "beamflow_payment_plan_requests_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payment_plan_requests" ADD CONSTRAINT "beamflow_payment_plan_requests_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payment_plan_requests" ADD CONSTRAINT "beamflow_payment_plan_requests_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payment_plan_requests" ADD CONSTRAINT "beamflow_payment_plan_requests_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_portal_preferences" ADD CONSTRAINT "beamflow_portal_preferences_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_portal_preferences" ADD CONSTRAINT "beamflow_portal_preferences_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_integration_connections" ADD CONSTRAINT "beamflow_integration_connections_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_integration_sync_jobs" ADD CONSTRAINT "beamflow_integration_sync_jobs_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_integration_sync_jobs" ADD CONSTRAINT "beamflow_integration_sync_jobs_integration_connection_id_beamflow_integration_connections_id_fk" FOREIGN KEY ("integration_connection_id") REFERENCES "public"."beamflow_integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beamflow_credit_topups_org_created_idx" ON "beamflow_credit_topups" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_credit_topups_stripe_intent_uidx" ON "beamflow_credit_topups" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "beamflow_org_plan_subscriptions_org_idx" ON "beamflow_org_plan_subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_org_plan_subscriptions_org_active_uidx" ON "beamflow_org_plan_subscriptions" USING btree ("org_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "beamflow_overage_events_org_occurred_idx" ON "beamflow_overage_events" USING btree ("org_id","occurred_at");--> statement-breakpoint
CREATE INDEX "beamflow_usage_credits_org_cycle_idx" ON "beamflow_usage_credits" USING btree ("org_id","cycle_start");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_ab_tests_org_status_idx" ON "beamflow_workflow_ab_tests" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_ab_tests_flow_idx" ON "beamflow_workflow_ab_tests" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_approvals_step_idx" ON "beamflow_workflow_approvals" USING btree ("flow_run_step_id");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_approvals_org_decision_idx" ON "beamflow_workflow_approvals" USING btree ("org_id","decision");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_edges_version_idx" ON "beamflow_workflow_edges" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_edges_org_source_idx" ON "beamflow_workflow_edges" USING btree ("org_id","source_node_key");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_nodes_version_idx" ON "beamflow_workflow_nodes" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_nodes_org_type_idx" ON "beamflow_workflow_nodes" USING btree ("org_id","node_type");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_run_steps_run_step_idx" ON "beamflow_workflow_run_steps" USING btree ("flow_run_id","step_index");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_run_steps_org_status_idx" ON "beamflow_workflow_run_steps" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_versions_flow_version_idx" ON "beamflow_workflow_versions" USING btree ("flow_id","version_number");--> statement-breakpoint
CREATE INDEX "beamflow_workflow_versions_org_created_idx" ON "beamflow_workflow_versions" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "beamflow_interactive_messages_org_contact_idx" ON "beamflow_interactive_messages" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "beamflow_interactive_messages_org_status_idx" ON "beamflow_interactive_messages" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_interactive_options_message_idx" ON "beamflow_interactive_options" USING btree ("interactive_message_id");--> statement-breakpoint
CREATE INDEX "beamflow_interactive_responses_message_idx" ON "beamflow_interactive_responses" USING btree ("interactive_message_id");--> statement-breakpoint
CREATE INDEX "beamflow_interactive_responses_org_contact_idx" ON "beamflow_interactive_responses" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "beamflow_survey_questions_survey_idx" ON "beamflow_survey_questions" USING btree ("survey_id","position");--> statement-breakpoint
CREATE INDEX "beamflow_survey_responses_org_contact_idx" ON "beamflow_survey_responses" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "beamflow_survey_responses_survey_idx" ON "beamflow_survey_responses" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "beamflow_surveys_org_active_idx" ON "beamflow_surveys" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "beamflow_channel_effectiveness_org_day_idx" ON "beamflow_channel_effectiveness_daily" USING btree ("org_id","day");--> statement-breakpoint
CREATE INDEX "beamflow_client_risk_scores_org_level_idx" ON "beamflow_client_risk_scores" USING btree ("org_id","risk_level");--> statement-breakpoint
CREATE INDEX "beamflow_forecast_snapshots_org_horizon_idx" ON "beamflow_forecast_snapshots" USING btree ("org_id","horizon_days");--> statement-breakpoint
CREATE INDEX "beamflow_forecast_snapshots_org_generated_idx" ON "beamflow_forecast_snapshots" USING btree ("org_id","generated_at");--> statement-breakpoint
CREATE INDEX "beamflow_invoice_health_scores_org_health_idx" ON "beamflow_invoice_health_scores" USING btree ("org_id","health");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_chargeback_provider_event_uidx" ON "beamflow_chargeback_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "beamflow_chargeback_org_occurred_idx" ON "beamflow_chargeback_events" USING btree ("org_id","occurred_at");--> statement-breakpoint
CREATE INDEX "beamflow_dispute_events_dispute_idx" ON "beamflow_dispute_events" USING btree ("dispute_id");--> statement-breakpoint
CREATE INDEX "beamflow_dispute_events_org_created_idx" ON "beamflow_dispute_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "beamflow_disputes_org_status_idx" ON "beamflow_disputes" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_disputes_org_invoice_idx" ON "beamflow_disputes" USING btree ("org_id","invoice_id");--> statement-breakpoint
CREATE INDEX "beamflow_legal_risk_flags_org_resolved_idx" ON "beamflow_legal_risk_flags" USING btree ("org_id","is_resolved");--> statement-breakpoint
CREATE INDEX "beamflow_legal_risk_flags_org_severity_idx" ON "beamflow_legal_risk_flags" USING btree ("org_id","severity");--> statement-breakpoint
CREATE INDEX "beamflow_agent_decisions_org_created_idx" ON "beamflow_agent_decisions" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "beamflow_agent_decisions_org_type_idx" ON "beamflow_agent_decisions" USING btree ("org_id","decision_type");--> statement-breakpoint
CREATE INDEX "beamflow_agent_goal_progress_goal_idx" ON "beamflow_agent_goal_progress" USING btree ("goal_id","measured_at");--> statement-breakpoint
CREATE INDEX "beamflow_agent_goal_progress_org_measured_idx" ON "beamflow_agent_goal_progress" USING btree ("org_id","measured_at");--> statement-breakpoint
CREATE INDEX "beamflow_agent_goals_org_status_idx" ON "beamflow_agent_goals" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_agent_goals_org_type_idx" ON "beamflow_agent_goals" USING btree ("org_id","goal_type");--> statement-breakpoint
CREATE INDEX "beamflow_agent_tasks_org_status_idx" ON "beamflow_agent_tasks" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_approval_requests_org_status_idx" ON "beamflow_approval_requests" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_approval_requests_org_expires_idx" ON "beamflow_approval_requests" USING btree ("org_id","expires_at");--> statement-breakpoint
CREATE INDEX "beamflow_owner_commands_org_created_idx" ON "beamflow_owner_commands" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "beamflow_client_portal_sessions_account_idx" ON "beamflow_client_portal_sessions" USING btree ("portal_account_id","expires_at");--> statement-breakpoint
CREATE INDEX "beamflow_client_portal_sessions_org_created_idx" ON "beamflow_client_portal_sessions" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "beamflow_payment_plan_requests_org_status_idx" ON "beamflow_payment_plan_requests" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_payment_plan_requests_org_submitted_idx" ON "beamflow_payment_plan_requests" USING btree ("org_id","submitted_at");--> statement-breakpoint
CREATE INDEX "beamflow_integration_connections_org_type_idx" ON "beamflow_integration_connections" USING btree ("org_id","provider_type");--> statement-breakpoint
CREATE INDEX "beamflow_integration_sync_jobs_org_status_idx" ON "beamflow_integration_sync_jobs" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_integration_sync_jobs_connection_created_idx" ON "beamflow_integration_sync_jobs" USING btree ("integration_connection_id","created_at");--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD CONSTRAINT "beamflow_message_templates_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;