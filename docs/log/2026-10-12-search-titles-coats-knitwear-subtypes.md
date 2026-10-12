# Search titles for coats, knitwear and subtype pages; co-ord consolidation; /pages/contact redirect
**Date:** 2026-10-12 · **Status:** on staging, awaiting Tina's approval for main

## Goal
Part A of `2026-10-12-gsc-pulse-opportunities-plan.md` (that file is in the main checkout). Tina: "do what you need
to do but no blog yet". Blog items (B) were left alone, including A4 (the hijab guide's description, which lives in Ghost).

## What changed
- `lib/seoCopy.ts`:
  - `/jackets-coats` is now "Modest Coats for Women — Trench Coats & Jackets". 92 of 232 pieces are trench coats.
  - `/cardigans-sweaters` is now "Modest Knitwear — Cardigans & Sweaters for Women". "Modest knitwear" was at
    position 32.7 with 61 impressions.
  - `/blazers-vests` now says "for Women".
  - 11 new subtype entries: tops ×4, cardigans ×2, blazers-vests ×2, two-piece, hijab, wide-leg.
  - Every claim in a description was counted against the lane first. "Long coats", "maxi shirts" and
    "button-ups" were dropped because the grid barely holds them.
- `lib/laneSubtypes.ts`:
  - `subtypeSeo(laneSlug, sub, intro)` reads `SEO_COPY['/lane?type=x']` first, then falls back to the template.
    The module's own comment had named this as the intended path.
  - New `CONSOLIDATED_INTO_LANE` with `subtypeCanonical()`: `/modest-sets?type=co-ord` now canonicalises to
    `/modest-sets` and leaves the sitemap. The page still works and stays linked.
- `app/[lane]/page.tsx`: uses both.
- `next.config.ts`: 308 redirect `/pages/contact` → `/contact`. Pulse showed 5 visitors landing on a 404 there.
- `lib/laneSubtypes.test.ts` (new): covers the consolidation, the override, the template fallback, and that no
  `?type=` copy key points at a missing subtype.

Not done: A6 (homepage links to coats and knitwear). The category cards and quick links are Tina's picks with her
photos, so that is her call. Every page already links all lanes through the header menu.

## Verification
- `npx tsc --noEmit` clean; eslint clean on touched files.
- `npx vitest run`: 1,345 passed, **3 failed, and the same 3 fail without this change**:
  - `colourLeads`: one Lameera id is gone.
  - `edits`: fall-essentials lost picks.
  - `exclude`: one Aab pin is not published.
  All three come from the 2026-10-12 nightly catalogue data, not from this work. A first cold run showed a 4th
  failure that did not recur in three further runs.
- Negative control: with `CONSOLIDATED_INTO_LANE` emptied, the co-ord test fails (1 failed / 4 passed); restored,
  it passes 5/5.
- Staging checks: see below.
