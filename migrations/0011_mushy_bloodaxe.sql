ALTER TABLE "document" ADD COLUMN "order" integer;
--> statement-breakpoint

-- Populate order field based on current createdAt order for existing documents
UPDATE "document" SET "order" = sub.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) as row_number
  FROM "document"
) sub
WHERE "document".id = sub.id;

--> statement-breakpoint

-- Make the order column NOT NULL
ALTER TABLE "document" ALTER COLUMN "order" SET NOT NULL;