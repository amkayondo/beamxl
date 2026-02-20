CREATE TYPE "public"."integration_connection_status" AS ENUM('connected', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('stripe');--> statement-breakpoint
CREATE TABLE "beamflow_org_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider" "integration_provider" DEFAULT 'stripe' NOT NULL,
	"status" "integration_connection_status" DEFAULT 'disconnected' NOT NULL,
	"stripe_account_id" text,
	"stripe_publishable_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "beamflow_invoices_org_status_idx";--> statement-breakpoint
DROP INDEX "beamflow_invoices_org_due_date_idx";--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ALTER COLUMN "due_date" SET DATA TYPE timestamp with time zone USING ("due_date"::date::timestamp AT TIME ZONE 'UTC');--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "stripe_subscription_status" text;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "stripe_current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_orgs" ADD COLUMN "stripe_subscription_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
UPDATE "beamflow_webhook_events"
SET "event_id" = CASE
  WHEN "provider" = 'STRIPE' THEN "provider_event_id"
  ELSE "provider" || ':' || "provider_event_id"
END
WHERE "event_id" IS NULL;--> statement-breakpoint
UPDATE "beamflow_webhook_events" SET "event_type" = "provider" WHERE "event_type" IS NULL;--> statement-breakpoint
UPDATE "beamflow_webhook_events" SET "created_at" = "received_at" WHERE "created_at" IS NULL;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ALTER COLUMN "event_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "beamflow_webhook_events" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_org_integrations" ADD CONSTRAINT "beamflow_org_integrations_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_org_integrations_org_provider_uidx" ON "beamflow_org_integrations" USING btree ("org_id","provider");--> statement-breakpoint
CREATE INDEX "beamflow_org_integrations_org_provider_idx" ON "beamflow_org_integrations" USING btree ("org_id","provider");--> statement-breakpoint
CREATE INDEX "beamflow_invoices_org_status_due_date_idx" ON "beamflow_invoices" USING btree ("org_id","status","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "beamflow_webhook_events_event_id_uidx" ON "beamflow_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "beamflow_webhook_events_event_id_idx" ON "beamflow_webhook_events" USING btree ("event_id");
