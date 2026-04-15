# Content Pipeline

This project should no longer grow by duplicating hard-coded HTML blocks. The current prototype uses a manifest-driven frontend so `Projects`, `Articles`, `Guides`, and discovery surfaces can be fed from repository content while the broader application is still being shaped.

## Target Architecture

1. The content source lives inside the repository.
2. The UI does not hand-author every card. It reads a manifest.
3. The manifest describes the screen using a `section -> group -> block` structure.
4. The current prototype tries a local manifest first, then GitHub Raw, then browser cache, and finally an embedded fallback view.
5. When the repository is ready, manifest validation should run in CI.

Important context:

- this repository is currently a local frontend prototype
- the target product is expected to evolve into a dynamic application
- the browser-only content flow here is a temporary development model, not a final architecture promise

## Repository Layout

Recommended minimum structure:

```text
content/
  site-content.v1.json
  projects/
    index.json
    *.json
  articles/
    index.json
    *.json
  guides/
    *.json
    *.md
  assets/
    covers/
```

The `content/site-content.v1.json` file added in this project is the current main manifest. Later, it can become a smaller index file that references `projects/*.json`, `articles/*.json`, and `guides/*.json` records instead of holding all display content directly.

Recommended split:

- keep section order, labels, cards, and lightweight summaries in JSON
- store long-form guide, article, and project bodies in Markdown
- let record files point to optional `bodyPath` values when a card also owns a long-form body

## Manifest Contract

The main contract follows this shape:

```json
{
  "meta": {
    "version": 1,
    "generatedAt": "2026-04-15"
  },
  "sections": {
    "projects": {
      "title": "Projects",
      "subtitle": "A project catalog fed from GitHub",
      "intro": ["..."],
      "groups": [
        {
          "id": "projects-overview",
          "title": "Catalog Flow",
          "intro": ["..."],
          "blocks": [
            {
              "type": "cards",
              "items": [
                {
                  "tag": "Repository",
                  "title": "Project records",
                  "description": "...",
                  "href": "https://github.com/...",
                  "linkLabel": "Open folder",
                  "external": true
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

Supported `block.type` values:

- `paragraphs`
- `list`
- `cards`
- `tags`
- `callout`
- `markdown`
- `record-feed`

`record-feed` supports two layouts:

- default card hydration for reusable catalog grids
- `layout: "details"` when records should render as long-form sections with optional Markdown bodies

This gives us two major benefits:

- presentation components stay separate from content
- new records can appear without editing HTML
- long-form guide bodies can live in Markdown while cards and navigation stay structured
- project and article cards can be sourced from dedicated record files instead of a single large manifest
- repositories can open into richer inline notes without needing a separate page model first

## Fetch Strategy

The frontend uses this order:

1. `./content/site-content.v1.json`
2. `https://raw.githubusercontent.com/Krypera/LikeAnOpenSource/main/content/site-content.v1.json`
3. browser cache
4. embedded fallback view

That means:

- a version hosted from the same repo can use a relative path
- a separated presentation layer can still pull from GitHub Raw
- network failures can reuse the last known content
- the prototype does not fully break if the manifest cannot be loaded

## Important Assumption

If the site fetches content entirely from the browser, the repository or at least the manifest must be public. If the repository stays private, direct GitHub fetches are not enough and the project will need a small proxy or serverless layer.

## Suggested Next Technical Steps

Recommended order:

1. Define separate formats for `content/projects/*.json`, `content/articles/*.json`, and `content/guides/*.json`.
2. Reduce `site-content.v1.json` into a smaller index that references those records.
3. Add frontmatter or metadata references for Markdown-backed guide and article bodies.
4. Add JSON schema validation for the manifest and record files.
5. Run schema checks and broken-link validation in GitHub Actions.

## Dynamic Product Note

This content pipeline is useful for local prototyping, but it should not be treated as the final runtime model for the product.

As the project moves beyond prototype mode, a backend or server layer should take over content ingestion, normalization, caching, and API delivery.

## Local Development Note

When the page is opened through `file://`, `fetch()` behavior can be restricted depending on the browser. To test the manifest layer properly, serve the project through a small HTTP server instead of opening the HTML file directly.
