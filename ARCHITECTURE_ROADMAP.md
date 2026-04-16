# Architecture Roadmap

LikeAnOpenSource is being built as a dynamic application with a repository-backed publishing model.

## Why the current delivery layer is simple

Right now the repository uses plain HTML, CSS, and JavaScript so the team can move quickly on:

- information architecture
- content modeling
- contribution backlog design
- interaction design

That keeps iteration fast while the long-term application boundaries are still being defined.

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
- normalizes topic, project, article, and guide records
- validates contracts
- caches responses
- serves a stable API to the frontend

That removes direct browser fetch complexity and makes private-source support possible later.

### Content ingestion

The product should eventually separate:

- authoring format
- ingestion logic
- frontend rendering

Recommended direction:

- JSON for structure and lightweight metadata
- Markdown for long-form bodies
- backend normalization into a delivery-friendly API shape

## Phase View

### Phase 1

Foundation and content model.

Completed:

- manifest-driven sections
- Markdown-backed guide and topic bodies
- record-feed model for collection-driven content
- content validation

### Phase 2

Correct the repo framing so it matches the real product goal.

Completed:

- remove static-site deployment assumptions
- document the dynamic application target
- keep the web delivery model aligned with the long-term application direction

### Phase 3

Build a public contribution backlog.

Now in progress:

- top-level contribution backlog
- GitHub-backed topic briefs
- honest empty states for unpublished sections
- repository-managed visibility for open writing topics

### Phase 4

Publish the first real community-written content.

Now in progress:

- project, article, and guide collections stay empty until real submissions are merged
- published content can reuse the same record-plus-Markdown contract as the backlog
- section rendering is already ready for the first accepted community content

### Phase 5

Backend integration and production hardening.

Planned:

- API design
- server-side ingestion
- caching strategy
- production deployment model
- SEO and delivery polish

Now partially underway:

- fallback shell was reduced to an embedded-manifest app shell
- baseline metadata, robots, and favicon support were added
- validation covers shell metadata, embedded-manifest sync, and browser-side runtime contracts
- the planned production domain is wired into canonical, sitemap, and structured metadata
- search state can be expressed through URL query parameters

## Important Note

The current repository already expresses the intended product shape, but the long-term delivery model should still move behind a backend or server layer that owns ingestion, moderation, caching, and API delivery.
