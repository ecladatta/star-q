# Annotation Tool

## Overview
The Annotation Tool is a web-based application designed to facilitate the annotation of texts and tables.

## Deployment in Production

To deploy the Annotation Tool in production, follow these steps:

1. Copy `.env.example` to `.env` and update the environment variables.
   Set `BASE_URL` to the public application URL.

2. Build and run the Docker containers:
    ```bash
    docker compose -f compose.prod.yaml up -d --build
    ```

## Development

To install and run the Annotation Tool locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/ecladatta/annotation-tool.git
    cd annotation-tool
    ```

2. Install dependencies:
    ```bash
    pnpm install
    ```

3. Copy `.env.example` to `.env` and update the environment variables.

4. Start the postgres server:
    ```bash
    docker compose -f compose.dev.yaml up postgres
    ```

5. Run the migrations:
    ```bash
    pnpm db:migrate
    ```

6. Start the development server:
    ```bash
    pnpm dev
    ```

7. Open your browser and navigate to `http://localhost:3000`.

## Authentication (Optional)

To enable GitHub authentication, set the following environment variables:

```bash
AUTH_ENABLED=true
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

To optionally restrict access to specific users when authentication is enabled, set:

```bash
ALLOWED_EMAILS=user1@example.com,user2@example.com
```

## API Routes

The following API routes are available:

- `GET /api/corpus` - List all corpuses.
- `GET /api/corpus/[corpusId]` - Get metadata for a corpus.
- `GET /api/corpus/[corpusId]/analytics` - Get analytics for a corpus.
- `GET /api/corpus/[corpusId]/entities` - Get custom entities for a corpus.
- `GET /api/corpus/[corpusId]/export` - Export a corpus. Defaults to JSON; use `?format=rdf&mode=truthy` or `?format=rdf&mode=full` for RDF 1.2 Turtle.

## Corpus export format

When exporting a corpus via the "Export" button in the UI or the `GET /api/corpus/[corpusId]/export` API route, the corpus data can be returned as JSON or RDF 1.2 Turtle.
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

Full mode uses stable resources under `https://ecladatta.eurecom.fr/`:

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
