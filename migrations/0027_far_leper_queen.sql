ALTER TABLE "corpus" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "corpus" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "corpus" ADD CONSTRAINT "corpus_status_check" CHECK ("corpus"."status" IN ('active', 'archived'));