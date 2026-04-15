# LikeAnOpenSource

LikeAnOpenSource is a static documentation and discovery platform for people who want to explore open-source projects with clearer entry points, better technical context, and more useful contribution paths.

The site is intentionally content-driven:

- layout and navigation come from a manifest
- long-form guide bodies can live in Markdown
- project and article cards can come from record files
- content validation runs before deployment

## Current Product Direction

The project is moving in five phases:

1. Repo hygiene and publishing foundation
2. Real repository records in `Projects`
3. Article metadata plus Markdown bodies
4. Smaller fallback HTML and less drift risk
5. SEO and production polish

This repository now covers phase 1 and the beginning of phase 2.

## Repository Structure

```text
.
|-- content/
|   |-- site-content.v1.json
|   |-- projects/
|   |-- articles/
|   `-- guides/
|-- scripts/
|   |-- prepare-pages.mjs
|   `-- validate-content.mjs
|-- content-config.js
|-- content-service.js
|-- script.js
|-- style.css
`-- index.html
```

## Local Development

This project is a static site. Serve it over HTTP instead of opening `index.html` directly.

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
node scripts/validate-content.mjs
```

This validator checks:

- manifest structure
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
- future `content/articles/*.md`

### Record collections

Use collection indexes for reusable cards:

- `content/projects/index.json`
- `content/articles/index.json`

Each index points to dedicated record files so new entries can be added without rewriting large UI blocks.

## GitHub Pages Deployment

This repository now includes a GitHub Pages workflow that:

1. validates the content contract
2. prepares a clean `dist/` artifact
3. deploys the site with GitHub Actions

To use it, set the Pages source in GitHub to `GitHub Actions`.

The deployment artifact is prepared by:

```powershell
node scripts/prepare-pages.mjs
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for content rules, workflow expectations, and editing guidance.

## License

A public project license has not been finalized in this repository yet. That choice should be made deliberately before broader external contribution begins.
