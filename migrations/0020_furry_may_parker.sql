CREATE TABLE "corpus_ownership_transfer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"corpus_id" uuid NOT NULL,
	"target_user_id" text,
	"target_team_id" uuid,
	"requested_by_user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_by_user_id" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corpus_ownership_transfer_status_check" CHECK ("corpus_ownership_transfer"."status" IN ('pending', 'accepted', 'declined', 'revoked')),
	CONSTRAINT "corpus_ownership_transfer_target_check" CHECK (num_nonnulls("corpus_ownership_transfer"."target_user_id", "corpus_ownership_transfer"."target_team_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "corpus_ownership_transfer" ADD CONSTRAINT "corpus_ownership_transfer_corpus_id_corpus_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_ownership_transfer" ADD CONSTRAINT "corpus_ownership_transfer_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_ownership_transfer" ADD CONSTRAINT "corpus_ownership_transfer_target_team_id_team_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_ownership_transfer" ADD CONSTRAINT "corpus_ownership_transfer_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_ownership_transfer" ADD CONSTRAINT "corpus_ownership_transfer_responded_by_user_id_user_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "corpus_ownership_transfer_corpus_idx" ON "corpus_ownership_transfer" USING btree ("corpus_id");--> statement-breakpoint
CREATE INDEX "corpus_ownership_transfer_user_idx" ON "corpus_ownership_transfer" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "corpus_ownership_transfer_team_idx" ON "corpus_ownership_transfer" USING btree ("target_team_id");--> statement-breakpoint
ALTER TABLE "corpus" ADD CONSTRAINT "corpus_visibility_check" CHECK ("corpus"."visibility" IN ('private', 'public'));--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_role_check" CHECK ("corpus_collaboration"."role" IN ('viewer', 'editor'));--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_status_check" CHECK ("corpus_collaboration"."status" IN ('pending', 'accepted', 'declined', 'revoked'));--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_role_check" CHECK ("team_invitation"."role" IN ('owner', 'member'));--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_status_check" CHECK ("team_invitation"."status" IN ('pending', 'accepted', 'declined', 'revoked'));--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_role_check" CHECK ("team_membership"."role" IN ('owner', 'member'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" IN ('user', 'admin'));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_status_check" CHECK ("user"."status" IN ('active', 'blocked'));