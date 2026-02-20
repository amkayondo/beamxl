CREATE TYPE "public"."invoice_bundle_status" AS ENUM('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."recurring_schedule_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELLED');--> statement-breakpoint

CREATE TABLE "beamflow_invoice_recurring_schedules" (
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
);--> statement-breakpoint

CREATE TABLE "beamflow_invoice_bundles" (
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
);--> statement-breakpoint

CREATE TABLE "beamflow_invoice_bundle_items" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "bundle_id" text NOT NULL,
  "invoice_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "beamflow_invoices"
  ADD COLUMN "recurring_schedule_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "bundle_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "discount_applied_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "payment_link_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "early_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "early_discount_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "allow_partial_payments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "minimum_partial_amount_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "write_off_reason" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD COLUMN "written_off_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "beamflow_invoice_recurring_schedules"
  ADD CONSTRAINT "beamflow_invoice_recurring_schedules_org_id_beamflow_orgs_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_recurring_schedules"
  ADD CONSTRAINT "beamflow_invoice_recurring_schedules_contact_id_beamflow_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_recurring_schedules"
  ADD CONSTRAINT "beamflow_invoice_recurring_schedules_payment_plan_id_beamflow_payment_plans_id_fk"
  FOREIGN KEY ("payment_plan_id") REFERENCES "public"."beamflow_payment_plans"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "beamflow_invoice_bundles"
  ADD CONSTRAINT "beamflow_invoice_bundles_org_id_beamflow_orgs_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_bundles"
  ADD CONSTRAINT "beamflow_invoice_bundles_contact_id_beamflow_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "beamflow_invoice_bundle_items"
  ADD CONSTRAINT "beamflow_invoice_bundle_items_org_id_beamflow_orgs_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_bundle_items"
  ADD CONSTRAINT "beamflow_invoice_bundle_items_bundle_id_beamflow_invoice_bundles_id_fk"
  FOREIGN KEY ("bundle_id") REFERENCES "public"."beamflow_invoice_bundles"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoice_bundle_items"
  ADD CONSTRAINT "beamflow_invoice_bundle_items_invoice_id_beamflow_invoices_id_fk"
  FOREIGN KEY ("invoice_id") REFERENCES "public"."beamflow_invoices"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "beamflow_invoices"
  ADD CONSTRAINT "beamflow_invoices_recurring_schedule_id_beamflow_invoice_recurring_schedules_id_fk"
  FOREIGN KEY ("recurring_schedule_id")
  REFERENCES "public"."beamflow_invoice_recurring_schedules"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_invoices"
  ADD CONSTRAINT "beamflow_invoices_bundle_id_beamflow_invoice_bundles_id_fk"
  FOREIGN KEY ("bundle_id")
  REFERENCES "public"."beamflow_invoice_bundles"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "beamflow_invoice_bundles_org_bundle_number_uidx"
  ON "beamflow_invoice_bundles" USING btree ("org_id", "bundle_number");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_invoice_bundles_public_pay_token_uidx"
  ON "beamflow_invoice_bundles" USING btree ("public_pay_token");--> statement-breakpoint
CREATE INDEX "beamflow_invoice_bundles_org_status_due_date_idx"
  ON "beamflow_invoice_bundles" USING btree ("org_id", "status", "due_date");--> statement-breakpoint

CREATE INDEX "beamflow_invoice_recurring_org_status_next_run_idx"
  ON "beamflow_invoice_recurring_schedules" USING btree ("org_id", "status", "next_run_at");--> statement-breakpoint
CREATE INDEX "beamflow_invoice_recurring_org_contact_idx"
  ON "beamflow_invoice_recurring_schedules" USING btree ("org_id", "contact_id");--> statement-breakpoint

CREATE UNIQUE INDEX "beamflow_invoice_bundle_items_bundle_invoice_uidx"
  ON "beamflow_invoice_bundle_items" USING btree ("bundle_id", "invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_invoice_bundle_items_invoice_uidx"
  ON "beamflow_invoice_bundle_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "beamflow_invoice_bundle_items_org_bundle_idx"
  ON "beamflow_invoice_bundle_items" USING btree ("org_id", "bundle_id");--> statement-breakpoint

CREATE INDEX "beamflow_invoices_org_bundle_idx"
  ON "beamflow_invoices" USING btree ("org_id", "bundle_id");--> statement-breakpoint
CREATE INDEX "beamflow_invoices_org_recurring_schedule_idx"
  ON "beamflow_invoices" USING btree ("org_id", "recurring_schedule_id");--> statement-breakpoint
