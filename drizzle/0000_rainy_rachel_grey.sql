CREATE TYPE "public"."audit_actor_type" AS ENUM('USER', 'SYSTEM', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."automation_channel" AS ENUM('WHATSAPP', 'VOICE');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger" AS ENUM('BEFORE_DUE', 'ON_DUE', 'AFTER_DUE', 'UNRESPONSIVE');--> statement-breakpoint
CREATE TYPE "public"."call_outcome" AS ENUM('PROMISE_TO_PAY', 'CALLBACK', 'VOICEMAIL', 'FAILED', 'NO_RESPONSE');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('QUEUED', 'RINGING', 'ANSWERED', 'NO_ANSWER', 'BUSY', 'FAILED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('WHATSAPP', 'VOICE');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('OPEN', 'PENDING', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'SENT', 'DUE', 'OVERDUE', 'PAID', 'FAILED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."language_code" AS ENUM('EN', 'RW', 'LG');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('OUTBOUND', 'INBOUND', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."org_member_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."plan_frequency" AS ENUM('ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('PAYMENT', 'WHATSAPP', 'CALL', 'VOICE');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('RECEIVED', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_org_members" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_role" DEFAULT 'MEMBER' NOT NULL,
	"status" "org_member_status" DEFAULT 'ACTIVE' NOT NULL,
	"invited_by_user_id" text,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "beamflow_org_members_org_user_uq" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "beamflow_contact_tags" (
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_contact_tags_contact_id_tag_id_pk" PRIMARY KEY("contact_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"email" text,
	"language" "language_code" DEFAULT 'EN' NOT NULL,
	"opted_out_at" timestamp with time zone,
	"opt_out_reason" text,
	"last_inbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "beamflow_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'slate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "beamflow_tags_org_name_uq" UNIQUE("org_id","name")
);
--> statement-breakpoint
CREATE TABLE "beamflow_payment_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"frequency" "plan_frequency" NOT NULL,
	"start_date" date NOT NULL,
	"due_day_of_month" integer,
	"grace_days" integer DEFAULT 0 NOT NULL,
	"penalty_type" text DEFAULT 'NONE' NOT NULL,
	"penalty_value_minor" integer DEFAULT 0 NOT NULL,
	"status" "plan_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "beamflow_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"payment_plan_id" text,
	"invoice_number" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_date" date NOT NULL,
	"amount_due_minor" integer NOT NULL,
	"amount_paid_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"public_pay_token" text NOT NULL,
	"pay_link_url" text,
	"last_reminder_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "beamflow_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"provider_intent_id" text,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "payment_status" DEFAULT 'INITIATED' NOT NULL,
	"paid_at" timestamp with time zone,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"key" text NOT NULL,
	"language" "language_code" DEFAULT 'EN' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_message_templates_org_key_lang_version_uq" UNIQUE("org_id","key","language","version")
);
--> statement-breakpoint
CREATE TABLE "beamflow_automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"trigger_type" "automation_trigger" NOT NULL,
	"offset_days" integer DEFAULT 0 NOT NULL,
	"channel" "automation_channel" DEFAULT 'WHATSAPP' NOT NULL,
	"template_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"quiet_hours_start" integer,
	"quiet_hours_end" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "beamflow_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"channel" "channel" DEFAULT 'WHATSAPP' NOT NULL,
	"status" "conversation_status" DEFAULT 'OPEN' NOT NULL,
	"last_message_at" timestamp with time zone,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"assigned_to_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_conversations_org_contact_channel_uq" UNIQUE("org_id","contact_id","channel")
);
--> statement-breakpoint
CREATE TABLE "beamflow_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"correlation_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_hash" text,
	"user_agent_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_call_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"invoice_id" text,
	"conversation_id" text,
	"provider" text NOT NULL,
	"provider_call_id" text,
	"status" "call_status" DEFAULT 'QUEUED' NOT NULL,
	"outcome" "call_outcome",
	"duration_sec" integer,
	"transcript" text,
	"summary" text,
	"recording_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_message_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"conversation_id" text,
	"contact_id" text NOT NULL,
	"invoice_id" text,
	"direction" "message_direction" NOT NULL,
	"channel" "channel" DEFAULT 'WHATSAPP' NOT NULL,
	"provider" text DEFAULT 'BIRD' NOT NULL,
	"provider_message_id" text,
	"template_key" text,
	"template_version" integer,
	"body" text NOT NULL,
	"delivery_status" "delivery_status" DEFAULT 'QUEUED' NOT NULL,
	"failure_reason" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_integration_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider_kind" "provider_kind" NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"secret_ciphertext" text,
	"secret_key_ref" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "beamflow_integration_settings_org_kind_provider_uq" UNIQUE("org_id","provider_kind","provider")
);
--> statement-breakpoint
CREATE TABLE "beamflow_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"org_id" text,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"status" "webhook_status" DEFAULT 'RECEIVED' NOT NULL,
	"payload" jsonb NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "beamflow_webhook_events_provider_event_uq" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_org_members" ADD CONSTRAINT "beamflow_org_members_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_org_members" ADD CONSTRAINT "beamflow_org_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_org_members" ADD CONSTRAINT "beamflow_org_members_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD CONSTRAINT "beamflow_orgs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_contact_tags" ADD CONSTRAINT "beamflow_contact_tags_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_contact_tags" ADD CONSTRAINT "beamflow_contact_tags_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_contact_tags" ADD CONSTRAINT "beamflow_contact_tags_tag_id_beamflow_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."beamflow_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_contacts" ADD CONSTRAINT "beamflow_contacts_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_tags" ADD CONSTRAINT "beamflow_tags_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payment_plans" ADD CONSTRAINT "beamflow_payment_plans_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payment_plans" ADD CONSTRAINT "beamflow_payment_plans_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD CONSTRAINT "beamflow_invoices_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD CONSTRAINT "beamflow_invoices_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD CONSTRAINT "beamflow_invoices_payment_plan_id_beamflow_payment_plans_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."beamflow_payment_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payments" ADD CONSTRAINT "beamflow_payments_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_payments" ADD CONSTRAINT "beamflow_payments_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD CONSTRAINT "beamflow_message_templates_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_automation_rules" ADD CONSTRAINT "beamflow_automation_rules_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_automation_rules" ADD CONSTRAINT "beamflow_automation_rules_template_id_beamflow_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."beamflow_message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_conversations" ADD CONSTRAINT "beamflow_conversations_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_conversations" ADD CONSTRAINT "beamflow_conversations_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_conversations" ADD CONSTRAINT "beamflow_conversations_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_audit_logs" ADD CONSTRAINT "beamflow_audit_logs_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_audit_logs" ADD CONSTRAINT "beamflow_audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_call_logs" ADD CONSTRAINT "beamflow_call_logs_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_call_logs" ADD CONSTRAINT "beamflow_call_logs_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_call_logs" ADD CONSTRAINT "beamflow_call_logs_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_call_logs" ADD CONSTRAINT "beamflow_call_logs_conversation_id_beamflow_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."beamflow_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_message_logs" ADD CONSTRAINT "beamflow_message_logs_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_message_logs" ADD CONSTRAINT "beamflow_message_logs_conversation_id_beamflow_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."beamflow_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_message_logs" ADD CONSTRAINT "beamflow_message_logs_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_message_logs" ADD CONSTRAINT "beamflow_message_logs_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_integration_settings" ADD CONSTRAINT "beamflow_integration_settings_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ADD CONSTRAINT "beamflow_webhook_events_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beamflow_org_members_org_idx" ON "beamflow_org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "beamflow_org_members_user_idx" ON "beamflow_org_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_orgs_slug_uidx" ON "beamflow_orgs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "beamflow_contact_tags_org_idx" ON "beamflow_contact_tags" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "beamflow_contacts_org_name_idx" ON "beamflow_contacts" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "beamflow_contacts_org_opted_out_idx" ON "beamflow_contacts" USING btree ("org_id","opted_out_at");--> statement-breakpoint
CREATE INDEX "beamflow_contacts_org_phone_idx" ON "beamflow_contacts" USING btree ("org_id","phone_e164");--> statement-breakpoint
CREATE INDEX "beamflow_payment_plans_org_status_idx" ON "beamflow_payment_plans" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_payment_plans_contact_idx" ON "beamflow_payment_plans" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_invoices_public_pay_token_uidx" ON "beamflow_invoices" USING btree ("public_pay_token");--> statement-breakpoint
CREATE INDEX "beamflow_invoices_org_status_idx" ON "beamflow_invoices" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_invoices_org_due_date_idx" ON "beamflow_invoices" USING btree ("org_id","due_date");--> statement-breakpoint
CREATE INDEX "beamflow_invoices_contact_due_date_idx" ON "beamflow_invoices" USING btree ("contact_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_payments_provider_payment_id_uidx" ON "beamflow_payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "beamflow_automation_rules_org_idx" ON "beamflow_automation_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "beamflow_automation_rules_org_active_idx" ON "beamflow_automation_rules" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "beamflow_audit_logs_org_created_idx" ON "beamflow_audit_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_call_logs_provider_call_uidx" ON "beamflow_call_logs" USING btree ("provider_call_id");--> statement-breakpoint
CREATE INDEX "beamflow_call_logs_org_status_idx" ON "beamflow_call_logs" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_message_logs_provider_message_uidx" ON "beamflow_message_logs" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "beamflow_message_logs_org_contact_created_idx" ON "beamflow_message_logs" USING btree ("org_id","contact_id","created_at");--> statement-breakpoint
CREATE INDEX "beamflow_message_logs_conversation_created_idx" ON "beamflow_message_logs" USING btree ("conversation_id","created_at");