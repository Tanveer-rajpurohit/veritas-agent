CREATE TYPE "public"."connector_status" AS ENUM('active', 'needs_reconnect');--> statement-breakpoint
ALTER TABLE "connectors" ADD COLUMN "account_email" text;--> statement-breakpoint
ALTER TABLE "connectors" ADD COLUMN "status" "connector_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "connectors" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;