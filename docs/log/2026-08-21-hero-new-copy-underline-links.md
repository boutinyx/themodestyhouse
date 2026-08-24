# Hero: new headline/subline, pill CTA replaced with two underline links
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina sent a mockup crop (headline + subline, no buttons pictured) and said:
"i want this text and i want a button shop but i dont want a pill i just
want an stipe under and another button with disigners."

## What changed
`app/page.tsx`, hero content block:
- **Headline** → "Everything modest. *Finally in* one place." — the same
  text and markup the very first left-aligned pass used earlier today (see
  `docs/log/2026-08-21-hero-headline-left-bigger.md`), re-added rather than
  reinvented. Kept the `uppercase` class and 620px `maxWidth` from the two
  most recent revisions so it still doesn't reach the models on the right.
- **Subhead** → replaced with her new line ("The world's most curated edit
  of modest fashion — timeless pieces, trusted designers, effortless
  elegance."), longer than the previous subhead, so it now gets the same
  620px `maxWidth` cap the headline has — the old subhead was short enough
  not to need one.
- **CTA** → the single outlined `.btn-pill` "Explore the archive" button is
  gone, replaced with two plain text links, "Shop" (→ `/directory`) and
  "Designers" (→ `/designers`, the existing page of the same name already
  in the header nav). Neither uses `.btn-pill` — both are Marcellus-type,
  uppercase, letter-spaced text with a real `border-bottom` as the "stripe"
  she asked for, no fill, no radius, no border on the other three sides.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile) after a hard reload (see
  note below) — new headline/subhead/underline links all present, correct
  destinations, left-aligned, clear of the models at both widths.

## Aside: a stale-HMR false alarm, not a real bug
Mid-verification, an earlier screenshot showed the header rendered as TWO
rows — logo+search/heart on one line, nav+currency on another — which does
not match `components/Header.tsx`'s actual single-row layout on disk (that
file had changed on disk since it was last read this session, per the
harness's own note, likely another concurrent session's edit). Investigated
before assuming a real bug: the DOM's own class list at the time
(`hidden lg:flex items-center justify-between gap-6 px-10 pt-5 pb-4`) matched
NEITHER the current file NOR any prior version from this session — a strong
signal of a stale Next.js dev-server HMR module replacement rather than an
actual code issue. A hard `page.reload()` in the same Playwright session
immediately fixed it — the DOM's `outerHTML` after reload matched the
on-disk file exactly, single row, everything correct. No code change was
needed or made for this; noted here only so a future session doesn't
re-diagnose the same non-bug.
