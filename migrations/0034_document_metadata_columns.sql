ALTER TABLE "document" ADD COLUMN "wikidata_id" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "source_urls" text[];--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "version_date" text;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_wikidata_id_check" CHECK ("document"."wikidata_id" IS NULL OR "document"."wikidata_id" ~ '^Q[0-9]+$');--> statement-breakpoint
UPDATE "document" SET
  "wikidata_id" = CASE
    WHEN "raw"#>>'{_source,identificationMetadata,wikidata}' ~ '^Q[0-9]+$'
      THEN "raw"#>>'{_source,identificationMetadata,wikidata}'
    ELSE NULL
  END,
  "source_urls" = CASE
    WHEN jsonb_typeof("raw"#>'{_source,identificationMetadata,url}') = 'string'
      THEN ARRAY["raw"#>>'{_source,identificationMetadata,url}']
    WHEN jsonb_typeof("raw"#>'{_source,identificationMetadata,url}') = 'array'
      THEN (SELECT array_agg(v) FROM jsonb_array_elements_text("raw"#>'{_source,identificationMetadata,url}') AS t(v) WHERE v <> '')
    ELSE NULL
  END,
  "version_date" = NULLIF("raw"#>>'{_source,identificationMetadata,versionDate}', '');
