# Add a "Recently added" section to /staff/curate

**Date:** 2026-08-13 · **Status:** done, blocked on `ADMIN_PASSWORD`

## Goal

Tina: "I want the newly added items there and when I open I want to see
them immediately and be able to edit them." The page as it stood (built
2026-08-12, then deliberately redesigned the same day — see
`docs/log/2026-08-12-staff-curate.md`) only shows a summary of edits already
made elsewhere on the live site; it shows nothing on open.

## What changed

- **`app/api/staff/curate/list/route.ts`** — added `?scope=recent`. Filters
  server-side (before the ~12MB catalogue ever reaches the browser) to rows
  whose `firstSeen` equals the most recent `firstSeen` in the whole
  catalogue — not a hardcoded brand list, so this stays correct after every
  future `add-brands`/`refresh` run with no code change. New test file
  covers the 401 case, the unfiltered case, and the `scope=recent` filter.
- **`app/staff/curate/RecentlyAdded.tsx`** (new) — fetches that endpoint,
  renders every recent product as a card (image, brand, title, Keep/Cut).
  Cut calls the same `/api/staff/curate/decide` the on-page pencil-icon
  editor already uses, so it takes effect on the live site immediately and
  shows up in the tray below like any other cut.
- **`app/staff/curate/page.tsx`** — renders `<RecentlyAdded />` above the
  existing `<ReviewTray />`, both inside one page-level `<main>`.
- **`app/staff/curate/ReviewTray.tsx`** — its root changed from `<main>` to
  `<section>` (no more nested `<main>`), its top heading demoted `h1`→`h2`
  and its three subheadings `h2`→`h3`, to keep one real `h1` per page now
  that `RecentlyAdded` owns it.

## Verification

```
npx vitest run app/api/staff/curate/list/route.test.ts   # 3 passed
npx vitest run --exclude '.claude/**'                     # 39 files, 645 passed
npx tsc --noEmit                                           # clean
```

Exercised live against a real `next dev` with a throwaway local
`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` (never written to `.env`, never
committed): logged in, `/staff/curate` loaded 689 products — every row
whose `firstSeen` is 2026-08-13, which includes the 9 brands added earlier
today plus new arrivals from a handful of existing brands (touche-prive,
urban-modesty, chic-modesty, veiled, mariams, ipekstil, beyza) picked up by
today's separate refresh — confirming the date-based filter generalizes
correctly rather than only matching my batch. Clicked Cut on a real product
(`golden-dune:11067705950551`), confirmed it wrote to
`data/.live-cuts.json` and the button showed disabled/active on reload.
Deleted that file afterward — it was a verification artifact, not a real
editorial decision, and is gitignored so it never reached git regardless.

## Notes / follow-ups

- **`ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` are still unset** (checked
  `.env` — both blank), so nobody can log in yet, on this machine or
  (presumably) on Railway. This blocks the feature entirely, not just this
  addition — asked Tina previously whether to generate values, no answer
  yet.
- 689 unpaginated cards render fine but make for a very long scroll — worth
  revisiting (pagination, or collapsing by brand) if the daily "recent"
  count stays this size; today's count is unusually large because of the
  9-brand batch.
