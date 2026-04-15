# How to Contribute

LAOS is content-first right now. The most valuable early contributions are usually not huge feature ideas. They are improvements that make the next visitor feel less confused, less hesitant, and more able to act.

## What counts as a useful contribution

Good contributions usually improve one of these areas:

- weak or overly polished copy
- missing context inside a section
- guide paths that stop too early
- project cards that sound polished but say very little
- transitions that do not help the reader decide what to open next

If your change makes the next step clearer, it is a strong contribution.

## Current workflow

Short structured site content still lives in `content/site-content.v1.json`, while longer guide bodies can now live in `content/guides/*.md`.

The practical contribution flow is:

1. Find one concrete gap in the reading experience.
2. Update the relevant source file in JSON or Markdown, depending on whether you are changing structure or long-form guide content.
3. Run the site locally through an HTTP server and read the result in context.
4. Open a focused PR that explains what was unclear before and what became better.

## Keep changes honest

LAOS should not sound more finished than it really is. That means:

- do not invent momentum
- do not imply content exists when it does not
- do not use vague wording to hide thin structure
- prefer clarity over hype

The platform gets stronger when it says exactly what is real and exactly what is still being built.

## Should guides be written in Markdown?

Yes, for long-form guide bodies that is the right direction.

Short structured surfaces such as cards, section order, navigation labels, and lightweight summaries still fit well in JSON. But once a guide becomes substantial, its body should move into `content/guides/*.md` while JSON keeps the metadata and layout references.

That split gives us:

- cleaner editing for writers
- simpler rendering rules for the UI
- easier reuse of metadata across Explore, Guides, and future detail pages

## Best first contribution ideas

If you want a clean starting point, choose one of these:

1. Rewrite a weak card so it says something concrete.
2. Tighten a guide section that feels generic or repetitive.
3. Add missing context to a project or article lane.
4. Replace vague discovery language with honest criteria.

Small, clear improvements are exactly the kind of work this project needs right now.
