CREATE TABLE "annotation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"predicate_id" uuid NOT NULL,
	"object_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annotation_component" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entity_label" text,
	"entity_value" text,
	"entity_custom" boolean,
	"annotation_start" integer NOT NULL,
	"annotation_end" integer NOT NULL,
	"annotation_row" integer,
	"annotation_cell" integer,
	"annotation_value" text NOT NULL,
	"annotation_type" text NOT NULL,
	"annotation_tag" text NOT NULL,
	"element_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpus" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text,
	"content" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY NOT NULL,
	"corpus_id" uuid NOT NULL,
	"title" text NOT NULL,
	"raw" jsonb NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_subject_id_annotation_component_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."annotation_component"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_predicate_id_annotation_component_id_fk" FOREIGN KEY ("predicate_id") REFERENCES "public"."annotation_component"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_object_id_annotation_component_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."annotation_component"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_corpus_id_corpus_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpus"("id") ON DELETE cascade ON UPDATE no action;