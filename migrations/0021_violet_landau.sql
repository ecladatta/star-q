ALTER TABLE "team" ADD COLUMN "kind" text DEFAULT 'shared' NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_kind_check" CHECK ("team"."kind" IN ('personal', 'shared'));