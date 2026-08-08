# Removed the /style/[vibe] aesthetic feature; widened the footer
**Date:** 2026-08-09 · **Status:** done

## Goal
Tina: *"i want the aesthetic coloms completly gone to be honest so the styles. so you can
indeed widen the footer but the colums with style or aestethic you can leave out. and if you
could delte it everywhere"*

So: widen the footer to all category lanes, with **no** aesthetic column, and remove the
aesthetic/vibe feature from the site.

## The one fork, and how it was resolved
"Aesthetic" named two different things: the `/style/[vibe]` **pages** in the nav, and a
**filter dropdown labelled "Aesthetic"** on `/directory` and all 12 lane pages. The pages were
unambiguous; removing a working filter from the main browse surfaces was not, so it was put to
Tina rather than assumed.

She chose: **remove the filter and the pages, keep the data dormant.** `lib/vibes.ts`, the
`Vibe` type and the `vibe:` field on all 60 brands stay, so the feature is cheap to restore.
Nothing reads them now.

## What changed

**Deleted**
- `app/style/[vibe]/page.tsx` (3 prerendered pages: elegant, streetwear, maximalist).
- `components/IndexBar.tsx` — dead code, imported by nothing (three earlier log entries had
  already noted this); its only content was a chip nav including the aesthetic dropdown.

**Edited**
- `components/Nav.tsx` — dropped the "Styles" group. `groups` stays an array; `NavMenu` is
  built for N groups and a future one drops straight in.
- `components/MobileNav.tsx` — dropped the "Aesthetic" eyebrow and its three rows, plus the
  `VIBES` import. Updated the docblock, which described a four-level hierarchy that no longer
  exists, and the comment claiming *two* labels carry the grouping — now one.
- `components/DirectoryBrowser.tsx`, `components/FilterableGrid.tsx` — removed the "Aesthetic"
  `FilterDropdown`, the `vibe` state, the predicate clause, both memo dependency arrays and the
  `brandVibe`/`VIBES` imports. Remaining filters: Category (directory only) · Occasion · Brand ·
  Search.
- `app/sitemap.ts` — dropped the three `/style/*` entries added earlier today. 25 → 22 URLs.
- `components/Footer.tsx` — `CATEGORY_LANES.slice(0, 6)` → `CATEGORY_LANES`. Restores
  `/modest-sets`, `/modest-swimwear` and `/modest-activewear`, which had no internal link
  anywhere on the site.
- `CLAUDE.md` — §6 routing convention (vibes marked dormant, plus the new footer/`kind` trap)
  and §8 (the sitemap landmine closed, two durable rules kept).

**Deliberately kept** (Tina's choice): `lib/vibes.ts`, `Vibe` in `lib/types.ts`, `vibe:` on 60
brands, and `productsForVibe()` in `lib/products.ts` as the read-side accessor — now with no
caller.

## Verification

```
$ rm -rf .next tsconfig.tsbuildinfo && npx tsc --noEmit
=== tsc exit: 0 ===

$ npm run build          # compiled successfully; no /style route in the emitted table
$ npm test
Test Files  20 passed (20)
     Tests  407 passed (407)

$ npx eslint components/{Nav,MobileNav,Footer,FilterableGrid,DirectoryBrowser}.tsx app/sitemap.ts
=== eslint exit: 0 ===
```

Built output:
```
sitemap locs: 22          (was 25)
/style in sitemap:        none
footer lane links:        modest-abayas, modest-activewear, modest-dresses, modest-hijabs,
                          modest-sets, modest-skirts, modest-swimwear, modest-tops,
                          modest-trousers          (9 — was 6)
/style/* links on page:   none
```

**Typecheck traps hit twice, worth knowing.** `npx tsc --noEmit` failed twice on stale
*generated* types, not on real errors: first `.next/dev/types/validator.ts` referencing
`app/llms.txt/route.js` and `app/favourites/layout.js` (files yesterday's audit created and
deleted), then `.next/types/validator.ts` referencing the just-deleted
`app/style/[vibe]/page.js`. Next regenerates the validator from the route tree at build time
and does not prune it. **Clear `.next` before trusting a typecheck after adding or deleting a
route.** Related: `npx tsc --noEmit | tail -5; echo $?` reports *tail's* exit status — §10.20's
family of error.

## Notes / follow-ups
- **Not committed.** The working tree holds another session's in-progress layout sweep (24
  files). `app/style/[vibe]/page.tsx` was one of them — their change was a single responsive
  padding line from a sweep applied identically across their other files, so deleting it lost
  nothing unique, but a copy of the file, `IndexBar.tsx` and their full diff were saved to the
  session scratchpad first (`deleted-style-feature/`) since none of it exists in git.
- **The tree does not currently build, for reasons outside this change.** All verification
  above ran and passed *before* this appeared. Shortly afterwards the other session's in-flight
  edit to `components/VerifiedSpotlight.tsx` broke the parse at line 85: inside the
  `<style>{` … `}` template literal, a comment refers to a CSS property as `` `transform` `` —
  the backtick closes the template string. `Expected '</', got 'ident'`, and `tsc` reports
  TS1005 at 85 and 94. One-character fix (drop the backticks, or escape them) but it belongs to
  whoever is editing that file; it was deliberately not touched from here, per §10.17 on
  concurrent sessions.
- **Two new lint warnings in `components/MobileNav.tsx`, also not from this change.** The same
  session inserted a comment block between the `eslint-disable-next-line
  @next/next/no-img-element` at :130 and the `<img>` it protects, now at :134, so the directive
  no longer applies to anything and the `<img>` rule fires. `npm run lint` runs with
  `--max-warnings 0`, so this fails CI. Again a one-line fix in someone else's in-flight edit,
  left alone.
- `npm run lint` also fails on `.fontprobe.tmp.mjs`, an untracked temp file at repo root created
  by the other session at 00:05, before this work. Untracked, so it will not reach CI, but it
  fails the command locally until removed.
- `/hijabi-outfits`, `/modest-wedding-guest` and `/modest-summer-outfits` still have no internal
  link — they are excluded by the `CATEGORY_LANES` filter, not by the slice that was removed.
  `/hijabi-outfits` in particular should not get one until the near-duplicate-of-`/directory`
  problem (97.5% of the catalogue) is settled.
- No ADR: removing a UI surface constrains nothing architecturally, and the data layer that
  would make it an architectural decision was deliberately kept.
