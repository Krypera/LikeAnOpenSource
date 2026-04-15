# Contributing to LikeAnOpenSource

Thanks for helping improve LikeAnOpenSource.

The project is content-first right now. The most useful contributions are usually the ones that make the next visitor feel less lost, less hesitant, and more able to act.

This repository is currently a local prototype. Running it over HTTP during development does not mean the final product will stay browser-only.

## What to edit where

### Edit JSON when you are changing structure

Use JSON for:

- section order
- sidebar navigation
- cards
- summaries
- callouts
- internal link targets

Main files:

- `content/site-content.v1.json`
- `content/projects/index.json`
- `content/articles/index.json`

### Edit Markdown when you are changing long-form writing

Use Markdown for:

- guide bodies
- project notes
- long-form article bodies

Current guide files:

- `content/guides/how-to-read-the-guides.md`
- `content/guides/how-to-contribute.md`

Current article files:

- `content/articles/step-by-step-teaching-content.md`
- `content/articles/real-world-breakdowns.md`
- `content/articles/deep-dives-into-system-choices.md`
- `content/articles/writing-from-inside-the-workflow.md`

Current project note files:

- `content/projects/facebook-docusaurus.md`
- `content/projects/vitejs-vite.md`
- `content/projects/biomejs-biome.md`
- `content/projects/cli-cli.md`

## Adding a new project record

1. Create a new file in `content/projects/`.
2. Give it a stable `id`.
3. Add `tag`, `title`, `description`, optional `details`, and a `bodyPath` if the project needs a deeper note.
4. Use `href` and `linkLabel` for the in-app jump target, then `resourceHref`, `resourceLinkLabel`, and `resourceExternal` for the real repository link when needed.
5. Register the record in `content/projects/index.json`.
6. Reference that record from the relevant `record-feed` block when needed.

## Adding a new article record

1. Create a new file in `content/articles/`.
2. Give it a stable `id`.
3. Add card metadata that says something concrete, plus optional `details` and a `bodyPath` when the article has a Markdown body.
4. Register the record in `content/articles/index.json`.
5. Connect it to the correct `record-feed` in the manifest.

## Writing standards

Please keep the tone:

- clear instead of inflated
- specific instead of generic
- useful instead of decorative
- honest about what exists and what is still being built

Avoid:

- vague praise
- filler phrases
- unexplained hype
- cards that sound polished but say very little

## Local checks

Serve the site locally:

```powershell
python -m http.server 4173
```

Then validate content:

```powershell
node scripts/sync-embedded-manifest.mjs
node scripts/validate-content.mjs
```

## Pull request checklist

Before opening a PR, make sure:

- the changed page reads naturally in context
- new anchors resolve correctly
- new records are registered in the proper index file
- Markdown paths exist and load
- the embedded manifest was resynced after manifest changes
- `node scripts/validate-content.mjs` passes

## License note

The repository does not yet declare a public license. Until that is finalized, keep contributions focused on content, structure, and documentation rather than assumptions about downstream reuse terms.
