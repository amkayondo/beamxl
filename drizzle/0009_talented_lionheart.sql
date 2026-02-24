ALTER TABLE "beamflow_invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "beamflow_invoices" ADD COLUMN "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL;