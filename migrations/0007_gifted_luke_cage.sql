CREATE TABLE "corpus_custom_entity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"corpus_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"datatype" text DEFAULT 'string' NOT NULL,
	"entity_type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "corpus_custom_entity" ADD CONSTRAINT "corpus_custom_entity_corpus_id_corpus_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpus"("id") ON DELETE cascade ON UPDATE no action;