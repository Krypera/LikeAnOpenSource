# Content Pipeline

This project should no longer grow by duplicating hard-coded HTML blocks. The current delivery layer uses a manifest-driven frontend so `Contribute`, `Projects`, `Articles`, `Guides`, and discovery surfaces can be fed from repository content while the broader application continues to mature.

## Target Architecture

1. The content source lives inside the repository.
2. The UI does not hand-author every card. It reads a manifest.
3. The manifest describes the screen using a `section -> group -> block` structure.
4. The frontend tries a same-origin manifest first, then GitHub Raw, then an embedded fallback payload, and finally browser cache.
5. The topic backlog is repository-backed and should be controllable from `content/topics/index.json`.
6. The embedded manifest inside `index.html` should be regenerated from repository content after content changes.

Important context:

- this repository already acts as the source of truth for visible backlog topics
- the target product is expected to evolve into a dynamic application
- the current browser-delivered content flow is a transitional implementation, not the final architecture promise

## Repository Layout

Recommended minimum structure:

```text
content/
  site-content.v1.json
  topics/
    index.json
    *.json
    *.md
  projects/
    index.json
    *.json
  articles/
    index.json
    *.json
  guides/
    *.md
```

Recommended split:

- keep section order, labels, cards, and lightweight summaries in JSON
- store long-form topic, guide, article, and project bodies in Markdown
- let record files point to optional `bodyPath` values when a card also owns a long-form body
- let article topic records define a top-level `type` so the publishing model can distinguish explainers, research pieces, statistics writing, editorials, and other article kinds
- allow Markdown bodies to embed images with standard `![alt](path "caption")` syntax

## Manifest Contract

Supported source-manifest `block.type` values:

- `paragraphs`
- `list`
- `cards`
- `tags`
- `callout`
- `markdown`
- `record-feed`

The generated embedded payload can also contain render-ready block types:

- `markdown-inline`
- `record-sections`

`record-feed` supports two layouts:

- default card hydration for reusable catalog grids
- `layout: "details"` when records should render as long-form sections with optional Markdown bodies

If `records` is omitted, the frontend renders the full collection in the order defined by the index file. This is the preferred mode for the live topic backlog because visibility should be controlled only from `content/topics/index.json`.

## Fetch Strategy

The frontend uses this order:

1. `./content/site-content.v1.json`
2. `https://raw.githubusercontent.com/Krypera/LikeAnOpenSource/main/content/site-content.v1.json`
3. embedded manifest bundled into `index.html`
4. browser cache

During development, refresh the embedded fallback payload with:

```powershell
node scripts/sync-embedded-manifest.mjs
```

That means:

- a version hosted from the same repo can use a relative path
- a separated presentation layer can still pull from GitHub Raw
- the shell can still render the current repository content even when manifest fetches fail
- the embedded payload is hydrated ahead of time so record feeds do not need a second round-trip during fallback
- network failures can reuse the last known cached content
- the application shell does not fully break if the manifest cannot be loaded

## Important Assumption

If the site fetches content entirely from the browser, the repository or at least the manifest must be public. If the repository stays private, direct GitHub fetches are not enough and the project will need a small proxy or serverless layer.

## Suggested Next Technical Steps

Recommended order:

1. Keep the topic backlog repository-backed and easy to moderate through PR review.
2. Publish the first real community-written `projects`, `articles`, and `guides` records without reintroducing seed content.
3. Add schema validation for record files if the collection count starts growing quickly.
4. Move the fetch/normalize layer behind a backend or API once the product needs stronger moderation and delivery control.

## Dynamic Product Note

This content pipeline should not be treated as the final runtime model for the product.

As the product matures, a backend or server layer should take over content ingestion, normalization, caching, and API delivery.

## HTTP Delivery Note

When the page is opened through `file://`, `fetch()` behavior can be restricted depending on the browser. Open the application through an HTTP origin instead of opening the HTML file directly.
