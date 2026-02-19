CREATE TYPE "public"."consent_channel" AS ENUM('SMS', 'WHATSAPP', 'VOICE', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."consent_method" AS ENUM('WRITTEN', 'VERBAL', 'ELECTRONIC', 'IMPORTED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('PAYMENT_RECEIVED', 'CONTACT_REPLIED', 'CONTACT_OPTED_OUT', 'AUTOMATION_FAILED', 'FLOW_COMPLETED', 'IMPORT_COMPLETED', 'COMPLIANCE_BLOCKED');--> statement-breakpoint
ALTER TYPE "public"."automation_channel" ADD VALUE 'EMAIL';--> statement-breakpoint
ALTER TYPE "public"."automation_channel" ADD VALUE 'SMS';--> statement-breakpoint
ALTER TYPE "public"."channel" ADD VALUE 'EMAIL';--> statement-breakpoint
ALTER TYPE "public"."channel" ADD VALUE 'SMS';--> statement-breakpoint
CREATE TABLE "beamflow_compliance_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"default_frequency_cap" integer DEFAULT 7 NOT NULL,
	"frequency_window_days" integer DEFAULT 7 NOT NULL,
	"quiet_hours_start" integer DEFAULT 21 NOT NULL,
	"quiet_hours_end" integer DEFAULT 8 NOT NULL,
	"default_timezone" text DEFAULT 'America/New_York' NOT NULL,
	"enforce_tcpa" boolean DEFAULT true NOT NULL,
	"enforce_fdcpa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_compliance_settings_org_uq" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "beamflow_contact_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"channel" "consent_channel" NOT NULL,
	"method" "consent_method" NOT NULL,
	"obtained_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_method" text,
	"evidence_url" text,
	"ip_address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_state_compliance_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"state_code" text NOT NULL,
	"frequency_cap" integer NOT NULL,
	"frequency_window_days" integer DEFAULT 7 NOT NULL,
	"quiet_hours_start" integer,
	"quiet_hours_end" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beamflow_state_rules_org_state_uq" UNIQUE("org_id","state_code")
);
--> statement-breakpoint
CREATE TABLE "beamflow_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beamflow_contacts" ADD COLUMN "timezone" text DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE "beamflow_contacts" ADD COLUMN "state_code" text;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "html_body" text;--> statement-breakpoint
ALTER TABLE "beamflow_message_templates" ADD COLUMN "channel" "channel";--> statement-breakpoint
ALTER TABLE "beamflow_compliance_settings" ADD CONSTRAINT "beamflow_compliance_settings_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_contact_consents" ADD CONSTRAINT "beamflow_contact_consents_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_contact_consents" ADD CONSTRAINT "beamflow_contact_consents_contact_id_beamflow_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."beamflow_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_state_compliance_rules" ADD CONSTRAINT "beamflow_state_compliance_rules_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_notifications" ADD CONSTRAINT "beamflow_notifications_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_notifications" ADD CONSTRAINT "beamflow_notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beamflow_contact_consents_org_contact_idx" ON "beamflow_contact_consents" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "beamflow_contact_consents_org_contact_channel_idx" ON "beamflow_contact_consents" USING btree ("org_id","contact_id","channel");--> statement-breakpoint
CREATE INDEX "beamflow_state_rules_org_idx" ON "beamflow_state_compliance_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "beamflow_notifications_user_read_idx" ON "beamflow_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "beamflow_notifications_org_created_idx" ON "beamflow_notifications" USING btree ("org_id","created_at");