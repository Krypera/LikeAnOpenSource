# LikeAnOpenSource

LikeAnOpenSource is a community-written documentation and discovery product for people who want clearer entry points into open source and a visible backlog of what should be written next.

This repository contains the application shell, the repository-backed content model, and the validation tooling that govern how the platform publishes backlog topics and future community-written content.

The content layer is intentionally structured:

- layout and navigation come from a manifest
- open contribution topics come from GitHub-backed record files
- long-form topic and guide briefs can live in Markdown
- published project notes, articles, and guides can later reuse the same record model
- content validation runs before deployment

## Current Product Direction

The project is moving in these phases:

1. Foundation and content model
2. Application architecture alignment
3. GitHub-backed contribution backlog
4. First published community content
5. Production polish and delivery readiness

The repository currently covers phases 1 and 2, the core implementation of phase 3, and the groundwork for phases 4 and 5.

Current emphasis:

- phases 1 and 2 are complete
- phase 3 is close to complete
- phase 4 is actively working, not just planned
- phase 5 already includes validation, SEO baseline work, and fallback hardening

## Repository Structure

```text
.
|-- content/
|   |-- site-content.v1.json
|   |-- topics/
|   |-- projects/
|   |-- articles/
|   `-- guides/
|-- scripts/
|   `-- validate-content.mjs
|-- content-config.js
|-- content-service.js
|-- script.js
|-- style.css
`-- index.html
```

## Running The Site

Open the application through an HTTP origin instead of opening `index.html` directly.

Recommended options:

```powershell
python -m http.server 4173
```

or

```powershell
npx serve . -l 4173
```

Then open the served address in your browser.

## Validation

Check the content contract before publishing:

```powershell
node scripts/sync-embedded-manifest.mjs
node scripts/validate-content.mjs
node scripts/validate-shell.mjs
node scripts/validate-runtime.mjs
node scripts/browser-smoke.mjs
```

This validator checks:

- manifest structure
- embedded manifest sync inside `index.html`
- required sections and group ids
- internal anchor targets
- Markdown file existence
- record-feed references
- referenced record file integrity
- shell-level metadata and asset references
- browser-side content-service runtime contracts
- real browser interaction smoke coverage for navigation, search, and mobile sidebar behavior

## SEO Baseline

The application already includes a lightweight SEO baseline:

- description, Open Graph, and Twitter summary metadata
- favicon and web manifest
- `robots.txt`
- canonical URL, `og:url`, JSON-LD website metadata, and `sitemap.xml`
- shareable search URLs through `?q=...`

Items intentionally left for the final domain:

- share image URLs that need absolute hosting paths

## Content Model

### Structured surfaces

Keep these in JSON:

- section order
- sidebar labels
- cards
- summaries
- callouts
- internal links

### Long-form content

Keep substantial topic and guide bodies in Markdown:

- `content/guides/*.md`
- `content/topics/*.md`

### Record collections

Use collection indexes for reusable cards:

- `content/topics/index.json`
- `content/projects/index.json`
- `content/articles/index.json`

`content/topics/index.json` is the live backlog. Published `projects` and `articles` collections can stay empty until real community-written content is merged.

## Application Direction

The current delivery layer uses HTML, CSS, and JavaScript while the broader application architecture continues to evolve. That keeps the published information architecture, repository-backed backlog, and validation flow easy to reason about while the backend shape is still being defined.

The application direction continues to focus on:

- shape the product structure
- prove the content model
- test GitHub-fed content experiments
- refine information architecture before locking in the full app stack

The next architectural step is a dynamic application with a real backend or server layer that can own content ingestion, normalization, caching, and delivery more cleanly than a browser-fetched repository flow.

See [ARCHITECTURE_ROADMAP.md](./ARCHITECTURE_ROADMAP.md) for the dynamic product direction.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for content rules, workflow expectations, and editing guidance.

## License

A public project license has not been finalized in this repository yet. That choice should be made deliberately before broader external contribution begins.
