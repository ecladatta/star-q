# Annotation Tool

## Overview
The Annotation Tool is a web-based application designed to facilitate the annotation of texts and tables.

## Deployment in Production

To deploy the Annotation Tool in production, follow these steps:

1. Copy `.env.example` to `.env` and configure it for the deployment:

    - Set `BASE_URL` to the public HTTPS URL of the application.
    - Replace the example PostgreSQL username, password, and database name. Use a
      unique, strong `POSTGRES_PASSWORD`.
    - Choose whether authentication is enabled and configure the corresponding
      secrets as described in [Authentication](#authentication-optional).
    - Set `API_KEY` if API clients should authenticate with an API key. Generate
      one with `openssl rand -hex 32`.

   Never commit the resulting `.env` file.

2. Build and run the Docker containers:
    ```bash
    docker compose -f compose.prod.yaml up -d --build
    ```

## Development

Clone the repository and create the local environment file:

```bash
git clone https://github.com/ecladatta/annotation-tool.git
cd annotation-tool
cp .env.example .env
```

Authentication is disabled by default in `.env.example`. Choose one of the two
development modes below.

### Run all services with Docker Compose

Keep `POSTGRES_HOST=postgres` in `.env`, then start the application, database,
and migration services:

```bash
docker compose -f compose.dev.yaml up -d --build
```

### Run the application on the host

This mode requires Node.js 24 and the pnpm version declared in `package.json`.
Set `POSTGRES_HOST=localhost` in `.env`, then run:

```bash
pnpm install --frozen-lockfile
docker compose -f compose.dev.yaml up -d postgres
pnpm db:migrate
pnpm dev
```

In either mode, open `http://localhost:3000`.

## Authentication (Optional)

Set `AUTH_ENABLED=false` to run without user accounts or browser sessions. The
web application and server actions are then accessible without signing in. If
`API_KEY` is empty, the corpus API routes are also public; if `API_KEY` is set,
those routes require the key in the `x-api-key` request header.

Set `AUTH_ENABLED=true` to require a signed-in user. A production deployment
must then provide:

- A unique `AUTH_SECRET`, generated with `openssl rand -base64 32`.
- At least one configured OAuth provider.
- `AUTH_URL` set to the public application URL (the default `${BASE_URL}` is
  suitable when `BASE_URL` is configured correctly).

When authentication is enabled, API requests may use either an authenticated
browser session or the configured `API_KEY`. An empty provider allowlist allows
every user authenticated by that provider, so configure `ALLOWED_EMAILS` or
`ALLOWED_WIKIMEDIA_IDS` when access should be restricted.

### GitHub Authentication

To enable GitHub authentication, set the following environment variables:

```bash
AUTH_ENABLED=true
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

Register the following authorization callback URL in the GitHub OAuth app,
replacing the origin with the configured `BASE_URL`:

```text
https://annotation.example.org/api/auth/callback/github
```

To optionally restrict access to specific users when authentication is enabled, set:

```bash
ALLOWED_EMAILS=user1@example.com,user2@example.com
```

### Wikimedia Authentication

To enable Wikimedia authentication, set the following environment variables:

```bash
AUTH_ENABLED=true
WIKIMEDIA_ID=your_wikimedia_client_id
WIKIMEDIA_SECRET=your_wikimedia_client_secret
```

Register the following callback URL for the Wikimedia OAuth consumer, replacing
the origin with the configured `BASE_URL`:

```text
https://annotation.example.org/api/auth/callback/wikimedia
```

To optionally restrict access to specific Wikimedia users when authentication is enabled, set:

```bash
ALLOWED_WIKIMEDIA_IDS=1234567,7654321
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
