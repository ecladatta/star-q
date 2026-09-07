CREATE TABLE "wikibase_instance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"instance_url" text NOT NULL,
	"sparql_endpoint" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wikibase_instance_instance_url_unique" UNIQUE("instance_url")
);
