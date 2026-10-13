# Written titles for every remaining subtype page; "Modest" in seven lane h1s
**Date:** 2026-10-13 · **Status:** partial — on branch `seo/subtypes-h1`, not yet on staging

## Goal
Finish what `2026-10-12-search-titles-coats-knitwear-subtypes.md` started: no `?type=` page should fall back to
the `subtypeSeo()` template, whose description pastes the PARENT lane's intro (so `/modest-hijabs?type=prayer-set`
described "chiffon, jersey, satin and crinkle hijabs"). And lane h1s that are a bare noun should carry "Modest"
where the measured queries do.

## What changed
- `lib/seoCopy.ts`: 32 new `/lane?type=x` entries — abayas ×4, hijabs ×3 (khimar-jilbab, undercap, prayer-set),
  dresses ×3, skirts ×3, tailored trousers, co-ord (canonicalises to the lane, written only to retire the
  template), swim ×6, active ×5, layering ×6. Every subtype now has written copy.
  - Same method as 2026-10-12: each material, style or garment a description names was counted in that
    subtype's published rows first, and the counts are in the comments. Search terms not in the grid were left
    out: no occasion row says "eid" or "wedding", so neither is used.
  - Prayer page titled "Prayer Dresses & Prayer Sets for Women" (prayer sets 33.8 -> 7.4; autocomplete "prayer
    dress"). 21 rows are titled "prayer dress", 53 jilbab, 33 prayer abaya, 26 prayer skirt.
  - `cropped-body-shirt` comes from one house, so its description does not say "brands".
- `lib/lanes.ts`: optional `heading` field. Set on Skirts, Tops, Trousers, Co-ord Sets, Blazers & Vests,
  Cardigans & Sweaters, Jackets & Coats ("Modest …"). `title` is unchanged, so nav, footer, mobile nav,
  breadcrumbs, "Also browse" and `/llms.txt` read as before. Abayas and Hijabs & Scarves are left alone: their
  measured queries are "abaya(s) for women" and "buy hijabs online", not "modest …".
- `app/[lane]/page.tsx`: h1 (and the CollectionPage `name`) is `sub.label ?? lane.heading ?? lane.title`.
  Subtype h1s are unchanged, so `audit:interaction`'s `lane-subtype-url` check (h1 must match /Butterfly/) still
  holds. Nothing else in `scripts/`, `lib/` or `e2e` asserts lane h1 text (grepped).
- `lib/laneSubtypes.test.ts`: new test that every subtype of every lane has an `SEO_COPY` entry; the template
  test now uses a fake subtype, since no real one falls back any more.

## Verification
- Negative control: renaming the cover-up key made the new test fail
  (`expected [ '/modest-swimwear?type=cover-up' ] to deeply equal []`); restored, 6/6 pass.
- `lib/seoCopy.test.ts` (title <= 60, description 50-160, no duplicates) passes with the 32 new entries.
- `rm -f tsconfig.tsbuildinfo; npx tsc --noEmit` exit 0; eslint clean on touched files.
- `npx vitest run`: 1,343 passed, 3 failed — colourLeads, edits, exclude. The same 3 fail with this change
  reverted on the same `origin/main` base (`9b01af2`); they come from nightly catalogue data.
- Not yet checked on staging.

## Notes / follow-ups
- Needs staging verification (rendered `<title>`, description and h1, parsed in python, §10.56) and Tina's
  approval before main.
