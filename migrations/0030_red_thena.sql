CREATE TABLE "unit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"corpus_id" uuid NOT NULL,
	"label" text NOT NULL,
	"wikidata_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unit_wikidata_id_check" CHECK ("unit"."wikidata_id" IS NULL OR "unit"."wikidata_id" ~ '^Q[0-9]+$'),
	CONSTRAINT "unit_label_check" CHECK ("unit"."label" <> '')
);
--> statement-breakpoint
ALTER TABLE "annotation_component" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_corpus_id_corpus_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unit_corpus_wikidata_idx" ON "unit" USING btree ("corpus_id","wikidata_id") WHERE "unit"."wikidata_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unit_corpus_label_idx" ON "unit" USING btree ("corpus_id","label") WHERE "unit"."wikidata_id" IS NULL;--> statement-breakpoint
ALTER TABLE "annotation_component" ADD CONSTRAINT "annotation_component_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "unit" (id, corpus_id, label, wikidata_id)
SELECT id, corpus_id, label, NULL
FROM corpus_custom_entity
WHERE custom_type = 'unit';--> statement-breakpoint
INSERT INTO "unit" (id, corpus_id, label, wikidata_id)
SELECT gen_random_uuid(), s.corpus_id, s.unit_label, s.unit_value
FROM (SELECT DISTINCT ON (d2.corpus_id, c2.unit_value) d2.corpus_id, c2.unit_label, c2.unit_value
  FROM annotation_component c2
  JOIN annotation a2 ON a2.object_id = c2.id
  JOIN document d2 ON d2.id = a2.document_id
  WHERE c2.unit_custom_id IS NULL
    AND c2.unit_custom IS DISTINCT FROM true
    AND c2.unit_value ~ '^Q[0-9]+$'
  ORDER BY d2.corpus_id, c2.unit_value, c2.unit_label) s;--> statement-breakpoint
UPDATE annotation_component SET unit_id = unit_custom_id WHERE unit_custom_id IS NOT NULL;--> statement-breakpoint
UPDATE annotation_component c
SET unit_id = u.id
FROM unit u, annotation a, document d
WHERE a.object_id = c.id
  AND d.id = a.document_id
  AND u.corpus_id = d.corpus_id
  AND u.wikidata_id = c.unit_value
  AND c.unit_custom_id IS NULL
  AND c.unit_custom IS DISTINCT FROM true
  AND c.unit_id IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM annotation_component
    WHERE unit_id IS NULL
      AND (
        unit_custom_id IS NOT NULL
        OR (unit_custom_id IS NULL AND unit_custom IS DISTINCT FROM true AND unit_value IS NOT NULL)
      )
  ) THEN
    RAISE EXCEPTION 'unit backfill invariant violated: unit-bearing annotation_component rows left with unit_id NULL';
  END IF;
END $$;