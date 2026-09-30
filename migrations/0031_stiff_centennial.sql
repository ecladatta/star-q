ALTER TABLE "annotation_component" DROP CONSTRAINT "annotation_component_unit_custom_id_corpus_custom_entity_id_fk";
--> statement-breakpoint
ALTER TABLE "annotation_component" DROP COLUMN "unit_value";--> statement-breakpoint
ALTER TABLE "annotation_component" DROP COLUMN "unit_label";--> statement-breakpoint
ALTER TABLE "annotation_component" DROP COLUMN "unit_custom";--> statement-breakpoint
ALTER TABLE "annotation_component" DROP COLUMN "unit_custom_id";--> statement-breakpoint
DELETE FROM "corpus_custom_entity" WHERE "custom_type" = 'unit';--> statement-breakpoint
ALTER TABLE "corpus_custom_entity" ADD CONSTRAINT "corpus_custom_entity_custom_type_check" CHECK ("corpus_custom_entity"."custom_type" IN ('entity','relation'));