# Add Try Modest to the catalogue
**Date:** 2026-10-01 · **Status:** done

## Goal
Import Try Modest's (Farheen) products, per Tina: "import the products" —
following her partner-onboarding questionnaire reply and the Ghost draft
founder post done earlier the same session.

## What changed
- `data/brands.ts`: new entry — `try-modest`, `https://trymodest.com`,
  category `Hijabs & modest`, city `United Kingdom`, currency `USD`
  (verified live: `Shopify.currency.active: "USD"`, matches Farheen's own
  "most of our customers are in the United States").
- `npx tsx scripts/add-brands.mjs try-modest` → 371 new raw rows, 0
  updated (brand-new brand, nothing to upsert against).
- `npm run build:data` → published 324 of 371 (87%); 14 explicitly
  rejected (4 only-large-sizes, 5 non-apparel:hardware, 2
  non-apparel:care, 2 url-pattern, 1 non-apparel:bags); 0 landed in
  `review.json` (nothing tagged `garment: other`).

## Verification
- **Re-checked the 2026-09-23 research's men's/boys'/baby/dropship
  concern against the LIVE feed before importing**: none of it is still
  there. Scanned both the 371 raw rows and the 324 published rows for
  boy/men/baby/thobe/bib/bodysuit — the only matches are false positives
  ("Keffiyeh ... Hijab" = a keffiyeh-print scarf, not menswear; "bodysuit
  ... for women" = a romper, explicitly women's). Try Modest's catalogue
  looks genuinely cleaned up since that research ran.
- `git fetch` immediately before touching the pipeline (§10.35/§10.53):
  `origin/main` 0 commits behind `origin/staging`, both before and right
  before the actual ingest.
- Parsed `decisions.json` before/after as JSON (not text-diffed the
  minified file): exactly 371 keys added, all `try-modest:*`, 0 removed,
  0 changed values — Invariant 14 held.
- Parsed `products.json` before/after: net -25 rows, but that's 324 new
  (try-modest) against 349 that dropped from *other* brands
  (touche-prive, jennah-boutique, abadia, hidayah, bait-hanayen,
  hijabipop, …) — all with `reason: "dead-link"` in `rejected.json`,
  i.e. delistings the nightly refresh had already decided on raw data
  this session never touched, just not yet republished. Not caused by
  this import; swept in by republishing. 0 previously-published
  non-try-modest ids lost for any OTHER reason.
- Two unrelated brands (glow-modesty, voile-chic) were auto-frozen by
  `brandDropViolations` (>30% collapse) — also pre-existing, also
  unrelated to try-modest.
- `npx tsc --noEmit` clean. `npx vitest run`: 1327 passed, 1 pre-existing
  unrelated failure (`lib/colourLeads.test.ts`, stale `lameera-moda` id —
  confirmed earlier this session, same on `main`). `npm run build`: clean,
  144 routes.

## Notes / follow-ups
- No `/designers/try-modest` page yet — `description` is unset (no
  editorial copy written), which is also the correct state per
  `/partner-with-us`: onboarding isn't paid/complete.
- No `vibe`/aesthetic filter reads this (dormant feature, §6), so
  `vibe: 'elegant'` is a reasonable default, not a meaningful editorial
  call.
- `currency: 'USD'` in `data/brands.ts` is the EXPECTED value only
  (Invariant 15) — the scrape already detected and logged the real
  per-fetch currency as USD too, so no mismatch to watch for here.
