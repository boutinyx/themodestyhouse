# Ghost posts can now carry tables and FAQ dropdowns
**Date:** 2026-10-14 · **Status:** done on staging, waiting on Tina's approval for main

## Goal
Inoma Digital emailed again. On the draft `open-abaya-vs-closed-abaya`, the comparison table
and the FAQ disappeared from the page whether they used an HTML card or a Markdown card. They
guessed the Ghost theme was hiding custom HTML. It wasn't: the theme isn't involved. Our
renderer, `components/GhostHtml.tsx`, drops anything that isn't on its allowlist.

## Cause
- No table tags (`table`, `tr`, `td`, …) and no `details`/`summary` on the allowlist, so all of
  it was dropped along with its text.
- A Markdown card's HTML arrives as a bare `<div>` with no card class and no begin/end comment
  marker (measured on the draft: 0 `<!--kg-card-…-->` comments). The renderer dropped every
  unknown div whole, so even the plain-formatted fallback they mentioned would have shown
  nothing on our site.

This is the third email about the same allowlist (after 2026-10-08's underline/CTA card and
the HTML card). Each fix covered only the element that had been reported.

## What changed
- `components/GhostHtml.tsx`:
  - Tables render with no attributes. Cells keep only an integer colspan/rowspan of 2–20. A
    table is wrapped in `.table-scroll` so it scrolls sideways on a phone.
  - `details`/`summary` render.
  - Ghost's own Toggle card renders as a native `<details>`.
  - A div with no `kg-*` class is kept as a bare wrapper. Unsupported Ghost cards are still
    dropped.
  - Inline styles are still stripped.
- `app/globals.css`: `.editorial-prose` table and details styles, in house tokens (hairline
  borders, bone header row).
- `components/GhostHtml.test.tsx`: two new tests, one for a pasted table and FAQ and one for
  the toggle card. The "unknown div dropped" assertion now uses a real unsupported card
  (gallery).

## Verification
- The real draft HTML, fetched through the Admin API, rendered through the new renderer:
  1 table with 10 of 10 rows, and 8 of 8 FAQ items. The only remaining `style=` is our own CTA
  card.
- `vitest components/GhostHtml.test.tsx`: 18 passed. `tsc --noEmit`: clean.
- Full suite: 3 failures (`colourLeads`, `edits` fall-essentials, `exclude` size-floor pins).
  The identical 3 fail on `origin/main` without this change; they come from catalogue drift.
- Staging (`7512c85`, deployed in 120 s): the draft body was placed into a real staging article and opened in Playwright, Chromium at 1280 and WebKit at 390. The table renders with a bone header row and hairline borders, the 8 FAQ items open and close, and scrollWidth equals the viewport at both sizes (no sideways overflow).

## Still dropped on purpose (told to the agency)
Gallery, embed (YouTube/Instagram/X), video, audio, file, product, header and signup cards,
plus forms, iframes and scripts. Images only render when uploaded to Ghost, not hotlinked.

## Notes / follow-ups
- The FAQ has no FAQPage structured data. Add it if they ask; it's a separate change.
