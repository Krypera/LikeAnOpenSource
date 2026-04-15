# LikeAnOpenSource

LikeAnOpenSource is a documentation and discovery product for people who want to explore open-source projects with clearer entry points, better technical context, and more useful contribution paths.

The current repository is a local frontend prototype plus a content model. It is being run over HTTP for development and product exploration while the broader application architecture is still taking shape.

The content layer is intentionally structured:

- layout and navigation come from a manifest
- long-form guide bodies can live in Markdown
- long-form project notes can also live in Markdown-backed records
- project cards can come from record files
- article cards and article bodies can come from record files plus Markdown
- content validation runs before deployment

## Current Product Direction

The project is moving in these phases:

1. Local prototype foundation and content model
2. Dynamic product architecture alignment
3. Real repository records in `Projects`
4. Article metadata plus Markdown bodies
5. Production polish and delivery readiness

The repository currently covers phases 1 and 2, a meaningful pass on phase 3, and the first working slice of phase 4.

## Repository Structure

```text
.
|-- content/
|   |-- site-content.v1.json
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

## Local Development

This prototype should be served over HTTP instead of opening `index.html` directly.

Recommended options:

```powershell
python -m http.server 4173
```

or

```powershell
npx serve . -l 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Validation

Check the content contract before publishing:

```powershell
node scripts/sync-embedded-manifest.mjs
node scripts/validate-content.mjs
```

This validator checks:

- manifest structure
- embedded manifest sync inside `index.html`
- required sections and group ids
- internal anchor targets
- Markdown file existence
- record-feed references
- referenced record file integrity

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

Keep substantial guide or article bodies in Markdown:

- `content/guides/*.md`
- `content/articles/*.md`

### Record collections

Use collection indexes for reusable cards:

- `content/projects/index.json`
- `content/articles/index.json`

Each index points to dedicated record files so new entries can be added without rewriting large UI blocks. Records can also own Markdown bodies when a catalog item needs a deeper explanation.

## Target Application Direction

This project is not intended to stay a browser-only prototype.

The current HTML, CSS, and JavaScript setup is a fast local prototype so we can:

- shape the product structure
- prove the content model
- test GitHub-fed content experiments
- refine information architecture before locking in the full app stack

The target direction is a dynamic application with a real backend or server layer that can own content ingestion, normalization, caching, and delivery more cleanly than a browser-only prototype.

See [ARCHITECTURE_ROADMAP.md](./ARCHITECTURE_ROADMAP.md) for the dynamic product direction.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for content rules, workflow expectations, and editing guidance.

## License

A public project license has not been finalized in this repository yet. That choice should be made deliberately before broader external contribution begins.
