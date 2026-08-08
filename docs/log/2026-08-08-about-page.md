# About page — six banded sections replacing the stub
**Date:** 2026-08-08 · **Status:** partial

## Goal

Turn `/about` from a two-sentence stub into the page that explains the curation
judgement behind `/designers`, publishes the catalogue figures, and surfaces the
affiliate disclosure that until now existed only in `content/legal/terms.md` §2
where nobody reads it (P0-D).

## What changed

- **`lib/aboutStats.ts`** (new) — `aboutStats()` returns `{ houses, pieces, sealed }`
  computed from `data/brands.ts` and `data/products.json`; `roundedPieces()` formats
  the piece count rounded **down** so the page can never overstate. Only three
  integers reach the markup — no arrays, which is what makes `/directory` ship 1.4 MB.
- **`lib/staticImage.ts`** — generalised from a hardcoded `/editorial/` regex to a
  dir-parameterised `variantIn`/`srcSetIn`, with `aboutVariant`/`aboutSrcSet` added.
  The existing exports are thin wrappers, so no call site changed. A test asserts the
  two folders cannot cross-match — they are generated at different widths, so a
  crossed match would emit a URL that 404s.
- **`scripts/optimise-images.mjs`** — new `about` job at the hero's widths
  (640/1024/1440/1920). The `editorial` job caps at 900px, which is visibly soft on a
  full-bleed band.
- **`public/about/mashrabiya.jpg`** (new) — from `higgsfield-library/13-mashrabiya.jpg`.
  975KB → 13/29/47/59KB across the four variants.
- **`app/about/page.tsx`** — rewritten as six bands: statement · full-bleed
  photograph · receipts · the standard · disclosure · close. `metadata.description`
  no longer says "curated by The Tina Aesthetic", which contradicted the unnamed
  house voice Tina chose.

Design decisions and their rationale: `docs/superpowers/specs/2026-08-08-about-page-design.md`.

## Verification

```
npx vitest run
  Test Files  20 passed (20)
  Tests  405 passed (405)

npx tsc --noEmit      → exit 0
npm run lint          → exit 0
npm run build         → ✓ Compiled successfully, 34 static pages

npm run audit:mobile  (against a production build on :3150)
  chromium  overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
  webkit    overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
  /about  [200]  fits

axe-core, full ruleset, /about at iPhone 13:
  axe violations on /about: 0
```

Two regressions were found by the audit and fixed before this commit:

1. **3 × serious colour-contrast.** `--brass` (`#a98a5b`) on `--aubergine`
   (`#441943`) measures **4.41:1** at the eyebrow's 10px — just under AA's 4.5.
   Fixed with `#e7d3b6`, the lighter brass the homepage already uses for an eyebrow
   on aubergine (`app/page.tsx`). Applied to band 2's eyebrow too, which would
   otherwise have started failing the day the copy slot is filled.
2. **2 × undersized tap target.** The `terms` and `privacy policy` links were inline
   in a sentence at 32×20 and 82×20. A link inside running text cannot be padded to
   44px without overlapping the lines around it, so they became a standalone row with
   `minHeight: 44`.

## Notes / follow-ups

- **Status is `partial`, not `done`.** Band 2's `MISSION` constant is an empty copy
  slot. The band renders as a clean image band until Tina writes it, but the page is
  not launch-ready with it empty — the site currently never says why it exists in her
  own words. Band 1 reuses the two sentences already live on the stub, so nothing on
  the page is invented voice (§10.18).
- **The figures are computed for a reason.** `BRANDS.length` went 59 → 60 mid-build
  (another session added ByHasanat, `2c003cc`) and the product count went
  11,125 → 11,127 (nightly refresh, `521591f`). Both reached the page with no edit.
- **Two hours were lost to a stale server.** A first `next start` held :3150, so a
  later one silently failed to bind and every measurement described the pre-fix
  build — including one audit run I initially misattributed to another session's
  work. Same family as §10.20 and §10.21. The habit that fixes it is cheap: before
  trusting a measurement, `curl` the served page for a string that only exists in
  the new build.
- `CLAUDE.md` is untracked (`.git/info/exclude:9`), so its corrections this session —
  34→59 brands, ~5k→~11.1k products, 6→8 blocked brands — exist only on this machine.
  Worth a decision separately.
