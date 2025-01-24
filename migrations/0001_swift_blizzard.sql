ALTER TABLE "document" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "type" text NOT NULL;