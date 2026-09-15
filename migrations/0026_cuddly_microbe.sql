ALTER TABLE "wikibase_instance" ADD COLUMN "concept_base_uri" text;

UPDATE "wikibase_instance"
SET "concept_base_uri" = CASE
  WHEN "instance_url" ~* '^https://(www\.)?wikidata\.org(:\d+)?(/|$)'
  THEN regexp_replace(regexp_replace("instance_url", '^https://', 'http://', 'i'), '/+$', '')
  ELSE regexp_replace("instance_url", '/+$', '')
END;

ALTER TABLE "wikibase_instance" ALTER COLUMN "concept_base_uri" SET NOT NULL;
