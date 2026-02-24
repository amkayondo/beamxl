DO $$ BEGIN
 CREATE TYPE "public"."extension_browser" AS ENUM('CHROME', 'EDGE', 'BRAVE', 'ARC', 'OPERA', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."extension_capture_source" AS ENUM('GMAIL', 'WEBPAGE', 'MANUAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."extension_capture_status" AS ENUM('DRAFT', 'RESOLVED', 'APPLIED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."extension_installation_status" AS ENUM('ACTIVE', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."invoice_bundle_status" AS ENUM('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mobile_approval_action" AS ENUM('APPROVE', 'DENY', 'SNOOZE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mobile_platform" AS ENUM('IOS', 'ANDROID', 'WEB');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."recurring_frequency" AS ENUM('WEEKLY', 'MONTHLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."recurring_schedule_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_invoice_bundle_items" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"bundle_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_invoice_bundles" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"bundle_number" text NOT NULL,
	"title" text,
	"status" "invoice_bundle_status" DEFAULT 'OPEN' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"due_date" timestamp with time zone,
	"amount_due_minor" integer DEFAULT 0 NOT NULL,
	"amount_paid_minor" integer DEFAULT 0 NOT NULL,
	"public_pay_token" text NOT NULL,
	"pay_link_url" text,
	"payment_link_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_invoice_recurring_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"payment_plan_id" text,
	"schedule_name" text NOT NULL,
	"invoice_prefix" text DEFAULT 'INV' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"auto_trigger_workflow" boolean DEFAULT true NOT NULL,
	"status" "recurring_schedule_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_extension_capture_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"installation_id" text,
	"source_type" "extension_capture_source" NOT NULL,
	"source_url" text,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "extension_capture_status" DEFAULT 'DRAFT' NOT NULL,
	"applied_invoice_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_extension_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"installation_id" text NOT NULL,
	"browser" "extension_browser" DEFAULT 'CHROME' NOT NULL,
	"extension_version" text NOT NULL,
	"status" "extension_installation_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_mobile_approval_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"approval_request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"action" "mobile_approval_action" NOT NULL,
	"note" text,
	"snooze_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beamflow_mobile_device_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"expo_push_token" text NOT NULL,
	"platform" "mobile_platform" NOT NULL,
	"app_version" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "recurring_schedule_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "bundle_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "discount_applied_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "payment_link_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "early_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "early_discount_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "allow_partial_payments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "minimum_partial_amount_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "write_off_reason" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN IF NOT EXISTS "written_off_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_bundle_items" ADD CONSTRAINT "beamflow_invoice_bundle_items_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_bundle_items" ADD CONSTRAINT "beamflow_invoice_bundle_items_bundle_id_beamflow_invoice_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."beamflow_invoice_bundles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_bundle_items" ADD CONSTRAINT "beamflow_invoice_bundle_items_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_bundles" ADD CONSTRAINT "beamflow_invoice_bundles_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_bundles" ADD CONSTRAINT "beamflow_invoice_bundles_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_recurring_schedules" ADD CONSTRAINT "beamflow_invoice_recurring_schedules_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_recurring_schedules" ADD CONSTRAINT "beamflow_invoice_recurring_schedules_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoice_recurring_schedules" ADD CONSTRAINT "beamflow_invoice_recurring_schedules_payment_plan_id_beamflow_payment_plans_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."beamflow_payment_plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_extension_capture_events" ADD CONSTRAINT "beamflow_extension_capture_events_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_extension_capture_events" ADD CONSTRAINT "beamflow_extension_capture_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_extension_capture_events" ADD CONSTRAINT "beamflow_extension_capture_events_installation_id_beamflow_extension_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."beamflow_extension_installations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_extension_capture_events" ADD CONSTRAINT "beamflow_extension_capture_events_applied_invoice_id_beamflow_invoices_id_fk" FOREIGN KEY ("applied_invoice_id") REFERENCES "public"."beamflow_invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_extension_installations" ADD CONSTRAINT "beamflow_extension_installations_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_extension_installations" ADD CONSTRAINT "beamflow_extension_installations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_mobile_approval_actions" ADD CONSTRAINT "beamflow_mobile_approval_actions_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_mobile_approval_actions" ADD CONSTRAINT "beamflow_mobile_approval_actions_approval_request_id_beamflow_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."beamflow_approval_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_mobile_approval_actions" ADD CONSTRAINT "beamflow_mobile_approval_actions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_mobile_device_tokens" ADD CONSTRAINT "beamflow_mobile_device_tokens_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_mobile_device_tokens" ADD CONSTRAINT "beamflow_mobile_device_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_invoice_bundle_items_bundle_invoice_uidx" ON "beamflow_invoice_bundle_items" USING btree ("bundle_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_invoice_bundle_items_invoice_uidx" ON "beamflow_invoice_bundle_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_invoice_bundle_items_org_bundle_idx" ON "beamflow_invoice_bundle_items" USING btree ("org_id","bundle_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_invoice_bundles_org_bundle_number_uidx" ON "beamflow_invoice_bundles" USING btree ("org_id","bundle_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_invoice_bundles_public_pay_token_uidx" ON "beamflow_invoice_bundles" USING btree ("public_pay_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_invoice_bundles_org_status_due_date_idx" ON "beamflow_invoice_bundles" USING btree ("org_id","status","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_invoice_recurring_org_status_next_run_idx" ON "beamflow_invoice_recurring_schedules" USING btree ("org_id","status","next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_invoice_recurring_org_contact_idx" ON "beamflow_invoice_recurring_schedules" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_extension_capture_events_org_status_created_idx" ON "beamflow_extension_capture_events" USING btree ("org_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_extension_capture_events_org_installation_idx" ON "beamflow_extension_capture_events" USING btree ("org_id","installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_extension_installations_org_installation_uidx" ON "beamflow_extension_installations" USING btree ("org_id","installation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_extension_installations_org_status_seen_idx" ON "beamflow_extension_installations" USING btree ("org_id","status","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_mobile_approval_actions_request_idempotency_uidx" ON "beamflow_mobile_approval_actions" USING btree ("org_id","approval_request_id","idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_mobile_approval_actions_org_created_idx" ON "beamflow_mobile_approval_actions" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_mobile_device_tokens_org_user_device_uidx" ON "beamflow_mobile_device_tokens" USING btree ("org_id","user_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "beamflow_mobile_device_tokens_expo_token_uidx" ON "beamflow_mobile_device_tokens" USING btree ("expo_push_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_mobile_device_tokens_org_user_active_idx" ON "beamflow_mobile_device_tokens" USING btree ("org_id","user_id","is_active");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoices" ADD CONSTRAINT "beamflow_invoices_recurring_schedule_id_beamflow_invoice_recurring_schedules_id_fk" FOREIGN KEY ("recurring_schedule_id") REFERENCES "public"."beamflow_invoice_recurring_schedules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "beamflow_invoices" ADD CONSTRAINT "beamflow_invoices_bundle_id_beamflow_invoice_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."beamflow_invoice_bundles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_invoices_org_bundle_idx" ON "beamflow_invoices" USING btree ("org_id","bundle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "beamflow_invoices_org_recurring_schedule_idx" ON "beamflow_invoices" USING btree ("org_id","recurring_schedule_id");