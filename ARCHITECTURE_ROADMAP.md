# Architecture Roadmap

LikeAnOpenSource is currently being explored as a local frontend prototype, but the product direction is a dynamic application rather than a permanently static website.

## Why the current prototype is simple

Right now the repository uses plain HTML, CSS, and JavaScript so we can move quickly on:

- information architecture
- content modeling
- guide structure
- repository curation rules
- interaction design

That makes local iteration faster while the real application boundaries are still being defined.

## Target Direction

The long-term application should move toward these layers:

1. Frontend application
2. Backend or server layer
3. Content ingestion pipeline
4. Persistent storage and caching
5. Admin or editorial workflow

## Recommended Dynamic Architecture

### Frontend

The frontend can evolve into a framework-based application that supports:

- routing
- detail pages
- richer search
- better loading states
- future authenticated experiences

### Backend

The backend should become the source that:

- reads from GitHub or editorial sources
- normalizes repository and article records
- validates contracts
- caches responses
- serves a stable API to the frontend

That removes browser-only fetch complexity and makes private-source support possible later.

### Content ingestion

The product should eventually separate:

- authoring format
- ingestion logic
- frontend rendering

Recommended direction:

- JSON for structure and lightweight metadata
- Markdown for long-form bodies
- backend normalization into a delivery-friendly API shape

### Storage

A persistent store or cache layer should eventually hold:

- normalized records
- search indexes
- cached GitHub content
- editorial metadata
- future user-facing signals such as popularity or freshness

## Phase View

### Phase 1

Local prototype and content model.

Completed:

- manifest-driven sections
- Markdown-backed guide bodies
- record-feed model for projects and articles
- content validation

### Phase 2

Correct the repo framing so it matches the real product goal.

Now in progress:

- remove static-site deployment assumptions
- document the dynamic application target
- keep local preview as a development-only mode

### Phase 3

Deepen repository records.

Planned:

- richer project metadata
- clearer repository evaluation fields
- more realistic curation surface

### Phase 4

Move articles toward real detail content.

Planned:

- article metadata records
- Markdown article bodies
- article detail rendering

### Phase 5

Backend integration and production hardening.

Planned:

- API design
- server-side ingestion
- caching strategy
- production deployment model
- SEO and delivery polish

## Important Note

Serving the current repo locally over HTTP is only a development convenience. It should not be mistaken for the final delivery architecture.
