CREATE TYPE "public"."system_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "system_role" "system_role" DEFAULT 'USER' NOT NULL;