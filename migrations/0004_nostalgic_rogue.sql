ALTER TABLE "annotation" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "annotation" ADD COLUMN "updated_at" timestamp DEFAULT now();