# Contributing to LikeAnOpenSource

Thanks for helping improve LikeAnOpenSource.

The site is intentionally honest right now: there is a live topic backlog, but there is not yet a large published content library. The most useful contributions are the ones that either improve that backlog or turn one backlog brief into real published content.

## What to edit where

### Edit JSON when you are changing structure or records

Use JSON for:

- section order
- sidebar navigation
- cards
- summaries
- callouts
- internal link targets
- topic records and published content records

Main files:

- `content/site-content.v1.json`
- `content/topics/index.json`
- `content/projects/index.json`
- `content/articles/index.json`

### Edit Markdown when you are changing long-form copy

Use Markdown for:

- topic briefs
- guide briefs and guide documentation
- published project notes
- published article bodies
- inline post images using standard Markdown image syntax

## Add a topic brief

1. Create a new file in `content/topics/` with a stable `id`.
2. Add `tag`, `title`, `description`, optional `details`, and a `bodyPath`.
3. If the topic is an article brief, add a top-level `type` such as the article's actual publishing form.
4. Add the long-form brief in `content/topics/*.md`.
5. Register the topic in `content/topics/index.json`.
6. Run the validation checks and confirm the topic appears in `Contribute`.

Removing a topic works the same way in reverse:

1. Remove it from `content/topics/index.json`.
2. Delete the JSON and Markdown files if they are no longer needed.

## Publish real content

When a topic becomes real public content, use the matching collection:

- `content/projects/` for repository notes
- `content/articles/` for long-form articles
- `content/guides/` for guide bodies and guide support content

Published content should only be added when it is real, reviewable work. Do not add placeholder or seed records just to make a section look populated.

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
- cards or records that imply content exists when it does not

## Validation Checks

Open the site through an HTTP origin:

```powershell
python -m http.server 4173
```

Then validate content:

```powershell
node scripts/sync-embedded-manifest.mjs
node scripts/validate-content.mjs
node scripts/validate-shell.mjs
node scripts/validate-runtime.mjs
node scripts/browser-smoke.mjs
```

## Pull Request Checklist

Before opening a PR, make sure:

- the changed page reads naturally in context
- new anchors resolve correctly
- new topic or content records are registered in the proper index file
- Markdown paths exist and load
- the embedded manifest was resynced after manifest changes
- `node scripts/validate-content.mjs` passes
- `node scripts/validate-shell.mjs` passes
- `node scripts/validate-runtime.mjs` passes
- `node scripts/browser-smoke.mjs` passes

## Moderation note

There is no site-side submission flow yet. The GitHub pull request process is the moderation layer for both backlog visibility and published content.

## License note

The repository does not yet declare a public license. Until that is finalized, keep contributions focused on content, structure, and documentation rather than assumptions about downstream reuse terms.
