CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"setup_completed_at" timestamp,
	"signup_enabled" boolean DEFAULT true NOT NULL,
	"signin_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_settings" ("id", "signup_enabled", "signin_enabled") VALUES ('default', true, true);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpus_collaboration" (
	"id" uuid PRIMARY KEY NOT NULL,
	"corpus_id" uuid NOT NULL,
	"target_user_id" text,
	"target_team_id" uuid,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" text,
	"responded_by_user_id" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corpus_collaboration_target_check" CHECK (num_nonnulls("corpus_collaboration"."target_user_id", "corpus_collaboration"."target_team_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_invitation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"invitee_user_id" text NOT NULL,
	"invited_by_user_id" text,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_membership" (
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_membership_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "corpus" ADD COLUMN "owner_type" text DEFAULT 'bootstrap' NOT NULL;--> statement-breakpoint
ALTER TABLE "corpus" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "corpus" ADD COLUMN "owner_team_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "blocked_by_user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_signed_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_corpus_id_corpus_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_target_team_id_team_id_fk" FOREIGN KEY ("target_team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_collaboration" ADD CONSTRAINT "corpus_collaboration_responded_by_user_id_user_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_invitee_user_id_user_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "corpus_collaboration_user_idx" ON "corpus_collaboration" USING btree ("corpus_id","target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "corpus_collaboration_team_idx" ON "corpus_collaboration" USING btree ("corpus_id","target_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitation_team_invitee_idx" ON "team_invitation" USING btree ("team_id","invitee_user_id");--> statement-breakpoint
ALTER TABLE "corpus" ADD CONSTRAINT "corpus_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus" ADD CONSTRAINT "corpus_owner_team_id_team_id_fk" FOREIGN KEY ("owner_team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corpus_owner_user_idx" ON "corpus" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "corpus_owner_team_idx" ON "corpus" USING btree ("owner_team_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "corpus" ADD CONSTRAINT "corpus_owner_check" CHECK (("corpus"."owner_type" = 'bootstrap' AND "corpus"."owner_user_id" IS NULL AND "corpus"."owner_team_id" IS NULL)
        OR ("corpus"."owner_type" = 'user' AND "corpus"."owner_user_id" IS NOT NULL AND "corpus"."owner_team_id" IS NULL)
        OR ("corpus"."owner_type" = 'team' AND "corpus"."owner_user_id" IS NULL AND "corpus"."owner_team_id" IS NOT NULL));
