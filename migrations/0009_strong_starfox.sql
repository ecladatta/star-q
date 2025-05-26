ALTER TABLE "annotation" DROP CONSTRAINT "annotation_subject_id_annotation_component_id_fk";
--> statement-breakpoint
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_predicate_id_annotation_component_id_fk";
--> statement-breakpoint
ALTER TABLE "annotation" DROP CONSTRAINT "annotation_object_id_annotation_component_id_fk";
--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_subject_id_annotation_component_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."annotation_component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_predicate_id_annotation_component_id_fk" FOREIGN KEY ("predicate_id") REFERENCES "public"."annotation_component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotation" ADD CONSTRAINT "annotation_object_id_annotation_component_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."annotation_component"("id") ON DELETE cascade ON UPDATE no action;