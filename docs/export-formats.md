# Export formats

## Corpus export format

When exporting a corpus via the "Export" button in the UI or the `GET /api/corpus/[corpusId]/export` API route, the corpus data can be returned as JSON, RDF 1.2 Turtle, or QuickStatements 3.0 commands.
This export includes all documents, annotations, and custom entities associated with the corpus, along with metadata about the export itself.

RDF exports have two modes:

- `?format=rdf&mode=truthy` exports only annotated knowledge graph statements and their qualifiers.
- `?format=rdf&mode=full` exports statements together with corpus structure and fine-grained provenance. `?format=rdf`, `?format=ttl`, `?format=turtle`, and `Accept: text/turtle` default to this mode.

### Top-level structure

<!-- eslint-skip -->
```json
{
  "exportMeta": {
    "version": "1.3",
    "type": "full-corpus-export"
  },
  "id": "<corpusId>",
  "title": "<corpusTitle>",
  "createdAt": "<ISO 8601 timestamp>",
  "updatedAt": "<ISO 8601 timestamp>",
  "documents": [ /* DocumentExport[] */ ],
  "customEntities": [ /* CorpusCustomEntity[] */ ]
}
```

### DocumentExport

Each exported document follows this shape:

- `id`: document UUID
- `title`: document title
- `createdAt`: creation timestamp (ISO)
- `updatedAt`: last update timestamp (ISO) or `null`
- `completedAt`: completion timestamp (ISO) or `null`
- `order`: numeric ordering for the document within the corpus
- `raw`: raw extracted document data (see `DocumentData` below)
- `annotations`: list of annotation triples with optional qualifiers

Each annotation can include:

- `qualifiers`: ordered list of qualifier predicate/value pairs attached to the annotation. Missing `qualifiers` should be treated as an empty list when importing older exports.

Example:

<!-- eslint-skip -->
```json
{
  "id": "<documentId>",
  "title": "<documentTitle>",
  "createdAt": "<ISO 8601 timestamp>",
  "updatedAt": "<ISO 8601 timestamp>" | null,
  "completedAt": "<ISO 8601 timestamp>" | null,
  "order": <number>,
  "raw": <DocumentData>,
  "annotations": [
    {
      "id": "<annotationId>",
      "subject": { /* DocumentAnnotationComponent */ },
      "predicate": { /* DocumentAnnotationComponent */ },
      "object": { /* DocumentAnnotationComponent */ },
      "qualifiers": [
        {
          "id": "<qualifierId>",
          "predicate": { /* DocumentAnnotationComponent */ },
          "value": { /* DocumentAnnotationComponent */ },
          "position": 0
        }
      ]
    }
  ]
}
```

#### DocumentData

The `raw` field contains the extracted document data that was imported into the system. It has this form:

<!-- eslint-skip -->
```json
{
  "_source": {
    "identificationMetadata": {
      "id": "<sourceId>",
      "versionDate": "<ISO 8601 timestamp>",
      "hash": "<hash>",
      "title": "<optional title>",
      "wikidata": "<optional wikidata id>",
      "url": "<optional url or urls>"
    },
    "extractionMetadata": [
      {
        "technology": "<extractor name>" | null,
        "texts": [
          {
            "startOffset": <number>?,
            "endOffset": <number>?,
            "value": "<text chunk>"
          }
        ],
        "tables": [
          {
            "startOffset": <number>?,
            "endOffset": <number>?,
            "tableData": [["cell", ...], ...]
          }
        ]
      }
    ]
  }
}
```

### DocumentAnnotationComponent

Annotations are stored as a triple of `subject`, `predicate`, and `object`, each encoded as a `DocumentAnnotationComponent`:

- `id`: UUID of the annotation component
- `entityLabel`: resolved label (custom labeling or inferred from extracted text)
- `entityValue`: resolved value (often same as label)
- `entityCustom`: `true` if this value comes from a custom entity definition
- `entityCustomId`: UUID of the custom entity (if `entityCustom`)
- `entityDatatype`: one of: `integer`, `decimal`, `boolean`, `string`, `date`, `time`, `datetime`, `year`, `month`, `day`, `url`
- `annotationStart` / `annotationEnd`: character offsets into the source text
- `annotationRow` / `annotationCell`: row/cell indices (for table annotations) or `null`
- `annotationValue`: the extracted string value for the annotation
- `annotationType`: `text` or `table`
- `annotationTag`: component role; one of `subject`, `predicate`, `object`, `qualifier-predicate`, or `qualifier-value`
- `elementIndex`: index of the text/table element this annotation belongs to

Example:

```json
{
  "id": "<componentId>",
  "entityLabel": "Author",
  "entityValue": "Jane Doe",
  "entityCustom": false,
  "entityCustomId": null,
  "entityDatatype": "string",
  "annotationStart": 123,
  "annotationEnd": 131,
  "annotationRow": null,
  "annotationCell": null,
  "annotationValue": "Jane Doe",
  "annotationType": "text",
  "annotationTag": "subject",
  "elementIndex": 0
}
```

### CorpusCustomEntity

Custom entities are defined per corpus and used to pre-populate annotation values.

- `id`: UUID
- `corpusId`: UUID of the parent corpus
- `label`: display label for the entity
- `value`: value stored on the entity
- `datatype`: entity datatype (`string` by default)
- `customType`: either `entity` or `relation`
- `createdAt` / `updatedAt`: timestamps

Example:

```json
{
  "id": "<uuid>",
  "corpusId": "<corpusId>",
  "label": "Location",
  "value": "New York",
  "datatype": "string",
  "customType": "entity",
  "createdAt": "<ISO 8601 timestamp>",
  "updatedAt": "<ISO 8601 timestamp>"
}
```

## RDF 1.2 export format

RDF exports are serialized by [N3.js](https://github.com/rdfjs/N3.js/) as RDF 1.2 Turtle.

### Truthy mode

Truthy mode emits each annotated statement directly. A blank node reifies the RDF 1.2 triple term and carries its qualifiers:

```turtle
wd:Q68550 wdt:P184 wd:Q7099 .

_:truthy-statement-id
  rdf:reifies <<(wd:Q68550 wdt:P184 wd:Q7099)>> ;
  pq:P69 wd:Q152838 .
```

Statements without qualifiers are emitted as ordinary triples.

### Full mode

Full mode uses stable resources under a configurable base URI (`RDF_NAMESPACE_BASE`, defaulting to `https://ecladatta.eurecom.fr/`):

- `corpus:` resources are [`dcat:Dataset`](https://www.w3.org/TR/vocab-dcat-3/#Class:Dataset) instances containing [`foaf:Document`](https://xmlns.com/foaf/spec/#term_Document) resources.
- Text elements and mentions use [NIF](https://persistence.uni-leipzig.org/nlp2rdf/ontologies/nif-core/nif-core.html) contexts and [RFC 5147 character ranges](https://datatracker.ietf.org/doc/html/rfc5147#section-2.2.2).
- Table elements use [CSVW](https://www.w3.org/ns/csvw) tables, columns, and cells. The `at:rowIndex` and `at:columnIndex` properties locate selected cells, and are declared in the export.
- Each grounded component is an [`oa:Annotation`](https://www.w3.org/TR/annotation-vocab/#annotation) whose target is its text range, table column, or table cell.
- Main statements have named `statement:` reifiers whose [`prov:wasDerivedFrom`](https://www.w3.org/TR/prov-o/#wasDerivedFrom) values reference the three component annotations.
- Qualifiers are statements about the named main statement. A blank reifier associates each qualifier triple term with its predicate/value provenance.

```turtle
wd:Q68550 wdt:P184 wd:Q7099 .

statement:ddc8f79f-4b82-497e-92d2-cfa42fb7cfbe
  rdf:reifies <<(wd:Q68550 wdt:P184 wd:Q7099)>> ;
  prov:wasDerivedFrom
    annotation:37a8e08c-24ef-4253-affa-b4e87cfa4328,
    annotation:0ab99b1c-699b-4c47-8ecc-a477dc5eeff7,
    annotation:2b349697-a0db-4551-8456-fccd1987a792 .

statement:ddc8f79f-4b82-497e-92d2-cfa42fb7cfbe
  pq:P69 wd:Q152838 .

_:5db97077-d88a-4d1a-bcf1-dc4b127543fc
  rdf:reifies <<(
    statement:ddc8f79f-4b82-497e-92d2-cfa42fb7cfbe
    pq:P69
    wd:Q152838
  )>> ;
  prov:wasDerivedFrom
    annotation:6893f26b-dbca-441d-9ac9-f4f94c336854,
    annotation:6b0af701-09e8-4b35-a30c-85052a56e1ce .
```

## QuickStatements 3.0 export format

QuickStatements exports serialize annotated statements as [QuickStatements 3.0](https://meta.wikimedia.org/wiki/QuickStatements_3.0/Documentation/User_guide) V1 command sequences: one statement per line, with parts separated by TAB characters. The file is meant to be opened in a text editor and pasted into the QuickStatements 3.0 interface (select the "V1" syntax).

Each line has the form `QID\tPID\tvalue\tPID\tvalue ...`, where the trailing `PID\tvalue` pairs are qualifiers:

```text
Q68550	P184	Q7099
Q68550	P69	"University of Vienna"
Q68550	P571	+1365-00-00T00:00:00Z/9	P585	+2019-01-01T00:00:00Z/11
```

Only annotations that fully resolve to Wikidata are exported:

- Annotations whose subject, predicate, or object references a custom corpus entity or a value with no Wikidata `Q`/`P` ID are skipped.
- Qualifiers that cannot be resolved are omitted from an otherwise valid line.
- Identical resulting commands are de-duplicated.

Skipped annotations are reported through the API and web UI during export.
