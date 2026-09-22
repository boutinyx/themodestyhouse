# Descriptive alt text on every product image
**Date:** 2026-09-22 · **Status:** done

## Goal
Tina shared generic AI-written SEO advice for fashion e-commerce. Most of it either didn't
apply to a directory that doesn't sell anything, or was already done (see the addendum in
`docs/log/2026-09-21-brand-page-seo-second-look.md`-adjacent chat — not filed separately).
One point was real and actionable: every product image's `alt` was just `p.title`, which
never names the brand and is sometimes a bare proper noun ("Zahra Dress", "Mirage Pant
Black") with no descriptive content at all.

## What was checked before writing anything
- Filter/sort duplicate-URL bloat (the advice's canonical-tag point): doesn't apply — brand,
  fabric, colour, price, sort are all `useState`, not URL params. No duplicate URLs exist.
- Product schema for Google Shopping (the advice's structured-data point): already tried and
  reverted (`05563fe`) after a live GSC error — "24 invalid items: offers, review or
  aggregateRating must be specified." This site never asserts a price in structured data
  because it doesn't sell anything; adding fake `offers` to chase a rich result would assert
  something false to Google. Left as is, documented in `lib/schema.ts`'s own comments.
- ItemList/Brand/Breadcrumb schema, WebP images, dynamic `?type=` landing pages, editorial
  problem-solving guides: already built, in some ways more carefully than the generic advice
  (thin subtype pages are deliberately withheld from the sitemap).

## What changed
`lib/altText.ts` (new) — `productAltText({ title, brandName, garment })`, composing:
- the original title, unchanged
- the garment's plural-safe label from `lib/tag.ts`'s canonical `GARMENT_LABELS`, but only
  when the title doesn't already contain that word (skips "Zahra Dress — dress by Zahra")
- the brand name, always — the one piece of context missing from every alt text on the site

Deliberately excludes colour: `lib/colour.ts`'s classifier covers ~72% of the catalogue and
is a best-effort text match on the title, not a verified fact (see its own header) — stating
a colour that turns out wrong in alt text is worse than the plain title.

Applied everywhere a product photo renders: `components/ProductCard.tsx`, `EditorsRail.tsx`,
`PopularShowcase.tsx`, `QuickView.tsx` (both the modal and the full-res zoom), and
`app/product/[brandSlug]/[shopifyId]/page.tsx` (which already did `${title} by
${brandName}` for its OG image but had missed the same treatment on the visible `<img>`).
Admin-only dev tools (`CurateClient.dev.tsx`, `PhotoReviewClient.dev.tsx`) left untouched —
internal staff surfaces, not public SEO/accessibility surfaces.

## Verification
```
npx tsc --noEmit                exit 0
eslint (all 7 changed files)    exit 0
vitest                          1324 passed, 1 failed (colourLeads.test.ts, pre-existing,
                                 unrelated, fails identically on main)
lib/altText.test.ts             4/4 — garment-word suppression when already in title,
                                 'other' never surfaced, brand always present
```
Spot-checked against real catalogue rows:
```
Zahra Dress — by Ria Miranda                                      (was: "Zahra Dress")
Mirage Pant Black — trousers by Yasmin Jay                        (was: "Mirage Pant Black")
Brushed Cotton Blend Crew Neck Top - Taupe — by Veiled            (was: title only, no brand)
```

## Notes / follow-ups
Also fixed in passing: `lib/staticImage.test.ts` had 9 failures for the three Maison
Merrachi cover images added earlier this session — `scripts/optimise-images.mjs` was never
run for them (CLAUDE.md §4's own rule). Ran it; all three now have their 400/900/1440
WebP variants on disk.
