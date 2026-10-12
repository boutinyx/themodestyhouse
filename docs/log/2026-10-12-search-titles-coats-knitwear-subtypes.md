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

### On staging (`themodestyhouse-staging-production.up.railway.app`, commit b619c42)
`/tmp/gscplan/verify.py` parses the HTML in python (§10.56) and checks status, `<title>` and canonical. Two rows
are controls that must NOT change: `/modest-abayas?type=open` still has its template title, and `/modest-sets`
keeps its title.
```
OK  /jackets-coats            Modest Coats for Women — Trench Coats & Jackets
OK  /cardigans-sweaters       Modest Knitwear — Cardigans & Sweaters for Women
OK  /blazers-vests            Modest Blazers & Vests for Women | The Modesty House
OK  /modest-tops?type=blouse  Modest Blouses for Women — Shop Blouses Online
OK  /modest-hijabs?type=hijab Modest Hijabs — Everyday Hijab Scarves Online
OK  /modest-sets?type=co-ord  canonical -> https://themodestyhouse.com/modest-sets
OK  /modest-sets?type=two-piece  Modest Two-Piece Sets for Women | The Modesty House
OK  /modest-abayas?type=open  Modest Open Abayas | The Modesty House        (control)
OK  /modest-sets              Modest Co-ord Sets — Matching 2-Piece Sets…   (control)
/pages/contact -> 308 /contact
sitemap 164 URLs (165 on production): co-ord gone, two-piece present
```
Only `<head>` tags changed, so nothing visible on the page differs.
