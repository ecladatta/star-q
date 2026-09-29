ALTER TABLE "annotation_component" ADD COLUMN "unit_value" text;--> statement-breakpoint
ALTER TABLE "annotation_component" ADD COLUMN "unit_label" text;--> statement-breakpoint
ALTER TABLE "annotation_component" ADD COLUMN "unit_custom" boolean;--> statement-breakpoint
ALTER TABLE "annotation_component" ADD COLUMN "unit_custom_id" uuid;--> statement-breakpoint
ALTER TABLE "annotation_component" ADD CONSTRAINT "annotation_component_unit_custom_id_corpus_custom_entity_id_fk" FOREIGN KEY ("unit_custom_id") REFERENCES "public"."corpus_custom_entity"("id") ON DELETE set null ON UPDATE no action;