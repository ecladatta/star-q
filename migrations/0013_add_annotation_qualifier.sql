CREATE TABLE "annotation_qualifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"annotation_id" uuid NOT NULL,
	"predicate_id" uuid NOT NULL,
	"value_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "annotation_qualifier" ADD CONSTRAINT "annotation_qualifier_annotation_id_annotation_id_fk" FOREIGN KEY ("annotation_id") REFERENCES "public"."annotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation_qualifier" ADD CONSTRAINT "annotation_qualifier_predicate_id_annotation_component_id_fk" FOREIGN KEY ("predicate_id") REFERENCES "public"."annotation_component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation_qualifier" ADD CONSTRAINT "annotation_qualifier_value_id_annotation_component_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."annotation_component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotation_qualifier_annotation_position_idx" ON "annotation_qualifier" USING btree ("annotation_id","position");
