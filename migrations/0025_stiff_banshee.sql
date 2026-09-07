ALTER TABLE "wikibase_instance" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;

INSERT INTO "wikibase_instance" ("label", "instance_url", "sparql_endpoint", "enabled", "is_default")
VALUES ('Wikidata', 'https://www.wikidata.org', 'https://query.wikidata.org/sparql', true, true)
ON CONFLICT ("instance_url") DO UPDATE SET "is_default" = true, "updated_at" = now();
