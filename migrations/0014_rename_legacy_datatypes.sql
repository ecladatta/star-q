-- Rename legacy datatype values to their canonical RDF-compatible XSD names:
-- url -> anyURI, datetime -> dateTime, year -> gYear, month -> gMonth, day -> gDay
UPDATE "corpus_custom_entity"
SET "datatype" = CASE "datatype"
	WHEN 'url' THEN 'anyURI'
	WHEN 'datetime' THEN 'dateTime'
	WHEN 'year' THEN 'gYear'
	WHEN 'month' THEN 'gMonth'
	WHEN 'day' THEN 'gDay'
	ELSE "datatype"
END
WHERE "datatype" IN ('url', 'datetime', 'year', 'month', 'day');
--> statement-breakpoint
UPDATE "annotation_component"
SET "entity_datatype" = CASE "entity_datatype"
	WHEN 'url' THEN 'anyURI'
	WHEN 'datetime' THEN 'dateTime'
	WHEN 'year' THEN 'gYear'
	WHEN 'month' THEN 'gMonth'
	WHEN 'day' THEN 'gDay'
	ELSE "entity_datatype"
END
WHERE "entity_datatype" IN ('url', 'datetime', 'year', 'month', 'day');
