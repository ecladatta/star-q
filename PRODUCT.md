# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are NLP/data teams preparing datasets. They work in a browser, reading imported documents (texts and tables), marking entities and relations, and producing structured data for downstream pipelines and knowledge graphs. Secondary audience: corpus owners and team leads who set up corpora, manage access, and review progress via analytics before export.

## Product Purpose

STAR-Q is a web application for annotating texts and tables into structured RDF statements. A team collaboratively curates corpora of documents, marking subject–predicate–object triples with qualifiers and provenance that export as JSON, RDF 1.2 Turtle, or QuickStatements 3.0 commands for direct use in Wikidata and knowledge-graph pipelines. Success means a corpus whose annotations are complete, consistent, and export-ready without further manual cleanup.

## Positioning

What a generic annotation tool cannot truthfully copy: annotations are modeled as grounded RDF triples with qualifiers and fine-grained provenance (text/table offsets, custom entities, Wikidata entity resolution, constraint checks) and export directly as RDF 1.2 (truthy or full-provenance modes) and QuickStatements 3.0 for Wikidata ingestion. Collaboration is first-class, not an add-on: corpora live in a permissioned model — personal/team/public visibility, owner/editor/viewer roles, invitations, and admin oversight.

## Operating Context

- Web app in the browser. Runs as a hosted interface or self-hosted (Docker Compose dev/prod, or on the host with pnpm).
- Sign-in: local username/password, GitHub OAuth, Wikimedia OAuth. The initial administrator is created or claimed at `/setup` after the first migration.
- Core workflow: corpus creation or import → document annotation → analytics/review → export (JSON, RDF 1.2 Turtle truthy/full, QuickStatements 3.0).
- Imports: IRIT, CorpusWalker, full-corpus JSON, Label Studio, CSV.
- Wikidata integration: entity resolution via wikibase-sdk, corpus-defined custom entities, qualifiers with range checks, constraint warnings.
- Administrators manage users, teams, corpora, signup/sign-in settings, and the audit log.

## Capabilities and Constraints

- Authorization model: personal corpora are owned by their owner; team corpora are owned by team owners and editable by all team members; owners invite an existing user by exact username or an existing team by exact slug as viewer or editor; invitations must be accepted before access begins; public corpora are readable by anonymous visitors; every creation, import, annotation, settings change, or deletion requires the corresponding authenticated permission; administrators can manage every corpus and team; a team must always retain at least one owner; corpus ownership is fixed at creation and cannot be transferred.
- Deleting a user deletes their personal corpora, and teams for which they are the sole owner (including those teams' corpora).
- No email/password or magic-link authentication. OAuth email addresses are retained only as provider profile data; no email allowlists; accounts are never linked automatically by matching email; a signed-in user can explicitly link another configured OAuth provider from the account page.
- Local password recovery is administrator-managed: an admin issues a temporary password, all sessions are revoked, and the user must choose a new password at the next sign-in.
- Public signup and non-admin sign-in are administrator-controlled settings.
- Optional `ADMIN_READ_API_KEY` grants deployment-level read-only API access (never mutations); without a session, only public corpora are readable via the API.
- RDF namespace base URI is configurable (`RDF_NAMESPACE_BASE`, default `https://ecladatta.eurecom.fr/`).
- App name is configurable (`APP_NAME`, currently STAR-Q).

## Brand Commitments

- Name: STAR-Q, recently renamed from "ECLADATTA Annotation Tool"; `APP_NAME` is configurable per deployment.
- Originating context: the ECLADATTA project at EURECOM (default RDF namespace base).
- Visual identity: modern SaaS minimalism in the craft register of Linear, Notion, Vercel, and GitHub. Restrained color, sharp type hierarchy, dense-but-readable surfaces, obsessive spacing, theme follows the OS with a persistent manual toggle, no deployment-specific imagery or copy. Navigation: GitHub-register shell — 48px top bar, left rail under /admin, tab bar under /corpus/[id]; the document editor is full-width with its own corpus header. Annotation color coding (subject/predicate/object three-hue) is functional and stays. Standing preference recorded from the 2026-08-27 redesign decision; the interface stays neutral for any self-hosted deployment.

## Evidence on Hand

- `README.md`: deployment, authentication and authorization model, API routes, and export formats.
- `docs/superpowers/specs/2026-06-18-wikidata-qualifiers-design.md`: qualifiers design spec.
- `CHANGELOG.md`: release history (current version 0.3.0).
- `homepage.png`: screenshot of the current interface.
- No testimonials, benchmark data, or external user evidence exists in the repo; future work must not fabricate these.

## Product Principles

- Structured output is the point: annotations must always be degradable to export-ready RDF/QuickStatements without loss.
- Collaboration is first-class: permissions, teams, and invitations shape every surface rather than being bolted on.
- Guide, don't block: constraint warnings and qualifier range checks steer annotators without standing in their way.
- Open for reading, closed for changing: public corpora are readable anonymously; every mutation demands the right permission.
- Hosted and self-hosted are equal citizens: nothing in the product may assume a single operator.

## Accessibility & Inclusion

No product-specific accessibility requirement established beyond general web standards.
