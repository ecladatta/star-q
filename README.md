# STAR-Q

## Overview
STAR-Q is a web-based application designed to facilitate the annotation of texts and tables.

## Prerequisites

- Docker
- Node.js and pnpm to develop on the host

## Deployment in Production

To deploy STAR-Q in production, follow these steps:

1. Copy `.env.example` to `.env` and configure it for the deployment:

    - Set `BASE_URL` to the public HTTPS URL, for example `https://annotation.example.org`.
    - Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` to deployment-specific values. Use a unique, strong `POSTGRES_PASSWORD`.
    - Configure at least one sign-in method and the corresponding secrets as described in [Authentication](#authentication).

2. Build and run the Docker containers:
    ```bash
    docker compose -f compose.prod.yaml up -d --build
    ```

## Wikibase instance

STAR-Q reads entities from a Wikibase instance for entity search, candidate classification, constraint warnings, RDF export, and entity links. Instances are configured in the registry at `/admin/wikibase`, not through environment variables.

Fresh deployments automatically contain a seeded "Wikidata" registry row (`https://www.wikidata.org` with `https://query.wikidata.org/sparql`) marked as the server default. Corpora that have not selected a specific instance use the server default. All requests are made server-side, so the instance needs no CORS configuration. RDF export prefixes and entity links are derived from the resolved instance.

To point the server default at a different Wikibase deployment, register it at `/admin/wikibase` and use its "Make default" action. A corpus can also select one specific registered instance in its settings; that selection then overrides the server default for that corpus.

Disabling an instance in the registry turns it off everywhere at once: corpora using it resolve to no configuration, and the UI degrades gracefully instead of silently rerouting to Wikidata. This applies to the server default as well; while no enabled instance is marked as default, corpora without an explicit selection report constraint features as unavailable.

The `WIKIBASE_INSTANCE` and `WIKIBASE_SPARQL_ENDPOINT` environment variables are no longer used. Deployments that relied on them must register their instance at `/admin/wikibase` and make it the default.

The constraint-warning and predicate-filtering features rely on Wikidata's constraint model (instance-of, subclass-of, and property constraints such as P2302). They work against instances that replicate that model. Against an instance that does not, the UI reports constraint checking as unavailable instead of failing.

## Authentication

A production deployment must provide a unique `AUTH_SECRET`. Generate one with:

```bash
openssl rand -base64 32
```

Set the result as `AUTH_SECRET`. Each deployment must use its own unique value.

You must also configure at least one sign-in method:

- [Local username/password authentication](#local-usernamepassword-authentication)
- [GitHub authentication](#github-authentication)
- [Wikimedia authentication](#wikimedia-authentication)

After the first migration, visit `/setup` to create the initial administrator account. The setup route is disabled once the initial administrator has been created.

### Local username/password authentication

Enable local accounts with:

```bash
LOCAL_CREDENTIALS_ENABLED=true
```

### GitHub authentication

Follow [GitHub's OAuth app documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app) to register an app, then set the following environment variables:

```bash
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

Register the following authorization callback URL in the GitHub OAuth app, replacing the origin with the configured `BASE_URL`:

```text
https://annotation.example.org/api/auth/callback/github
```

### Wikimedia authentication

Follow [Wikimedia's OAuth documentation for developers](https://www.mediawiki.org/wiki/OAuth/For_developers) to register a consumer, then set the following environment variables:

```bash
WIKIMEDIA_ID=your_wikimedia_client_id
WIKIMEDIA_SECRET=your_wikimedia_client_secret
```

Register the following callback URL for the Wikimedia OAuth consumer, replacing the origin with the configured `BASE_URL`:

```text
https://annotation.example.org/api/auth/callback/wikimedia
```

## Development

Clone the repository and create the local environment file:

```bash
git clone https://github.com/ecladatta/star-q.git
cd star-q
cp .env.example .env
```

Local username/password authentication is enabled by default in `.env.example`.

### Run all services with Docker Compose

Start the application, database, and migration services:

```bash
docker compose -f compose.dev.yaml up -d --build
```

### Run the application on the host

Set `POSTGRES_HOST=localhost` in `.env`, then run:

```bash
pnpm install --frozen-lockfile
docker compose -f compose.dev.yaml up -d postgres
pnpm db:migrate
pnpm dev
```

In either mode, open `http://localhost:3000`.

### Run tests

```bash
pnpm test
```

## API

In order to use the API, administrators must create an API key in the admin dashboard under **API keys**. The key can be used in the `x-api-key` like so:

```bash
curl \
  -H "x-api-key: $API_KEY" \
  https://annotation.example.org/api/corpus
```

### Routes

- `GET /api/corpus` - List the corpora visible to the caller.
- `GET /api/corpus/[corpusId]` - Get metadata for a corpus.
- `GET /api/corpus/[corpusId]/analytics` - Get analytics for a corpus.
- `GET /api/corpus/[corpusId]/entities` - Get custom entities for a corpus.
- `GET /api/corpus/[corpusId]/export` - Export a corpus. Defaults to JSON; use `?format=rdf&mode=truthy` or `?format=rdf&mode=full` for RDF 1.2 Turtle, or `?format=quickstatements` for QuickStatements 3.0 commands.

## Export formats

The JSON, RDF 1.2 Turtle, and QuickStatements 3.0 output shapes are documented in [docs/export-formats.md](docs/export-formats.md).
