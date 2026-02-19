CREATE TYPE "public"."flow_run_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED', 'DRY_RUN');--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED');--> statement-breakpoint
CREATE TABLE "beamflow_flow_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_id" text NOT NULL,
	"org_id" text NOT NULL,
	"triggered_by" text NOT NULL,
	"trigger_event" text,
	"run_status" "flow_run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beamflow_flows" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "flow_status" DEFAULT 'DRAFT' NOT NULL,
	"nodes_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"viewport_json" jsonb DEFAULT '{"x":0,"y":0,"zoom":0.9}'::jsonb NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "beamflow_flow_runs" ADD CONSTRAINT "beamflow_flow_runs_flow_id_beamflow_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."beamflow_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_flow_runs" ADD CONSTRAINT "beamflow_flow_runs_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_flows" ADD CONSTRAINT "beamflow_flows_org_id_beamflow_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."beamflow_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beamflow_flows" ADD CONSTRAINT "beamflow_flows_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beamflow_flow_runs_flow_idx" ON "beamflow_flow_runs" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "beamflow_flow_runs_org_status_idx" ON "beamflow_flow_runs" USING btree ("org_id","run_status");--> statement-breakpoint
CREATE INDEX "beamflow_flows_org_status_idx" ON "beamflow_flows" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "beamflow_flows_org_updated_idx" ON "beamflow_flows" USING btree ("org_id","updated_at");