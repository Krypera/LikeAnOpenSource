# Contributing to LikeAnOpenSource

Thanks for helping improve LikeAnOpenSource.

The project is content-first right now. The most useful contributions are usually the ones that make the next visitor feel less lost, less hesitant, and more able to act.

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
- future long-form article bodies

Current guide files:

- `content/guides/how-to-read-the-guides.md`
- `content/guides/how-to-contribute.md`

## Adding a new project record

1. Create a new file in `content/projects/`.
2. Give it a stable `id`.
3. Add `tag`, `title`, `description`, `href`, and `linkLabel`.
4. Register the record in `content/projects/index.json`.
5. Reference that record from the relevant `record-feed` block when needed.

## Adding a new article record

1. Create a new file in `content/articles/`.
2. Give it a stable `id`.
3. Add card metadata that says something concrete.
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
node scripts/validate-content.mjs
```

If you want to preview the deployment artifact:

```powershell
node scripts/prepare-pages.mjs
```

That generates `dist/`, which matches the files intended for GitHub Pages.

## Pull request checklist

Before opening a PR, make sure:

- the changed page reads naturally in context
- new anchors resolve correctly
- new records are registered in the proper index file
- Markdown paths exist and load
- `node scripts/validate-content.mjs` passes

## License note

The repository does not yet declare a public license. Until that is finalized, keep contributions focused on content, structure, and documentation rather than assumptions about downstream reuse terms.
