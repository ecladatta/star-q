# Annotation Tool

## Overview
The Annotation Tool is a web-based application designed to facilitate the annotation of texts and tables.

## Deployment in Production

To deploy the Annotation Tool in production, follow these steps:

1. Copy `.env.example` to `.env` and update the environment variables.

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
- `GET /api/corpus/[corpusId]/export` - Export a corpus (JSON download).

## Corpus export format

When exporting a corpus via the "Export" button in the UI or the `GET /api/corpus/[corpusId]/export` API route, the corpus data is returned in a structured JSON format.
This export includes all documents, annotations, and custom entities associated with the corpus, along with metadata about the export itself.

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
