# Swapped displayed images for 2 products (Aurora Abaya, White Icy)
**Date:** 2026-08-14 · **Status:** done

## Goal
Tina wanted two specific products to show a different photo than the one `pickImage()`
had selected at scrape time — a different real photo of the same product, not a new
product or a foreign image.

## Research before implementing
Neither `products.json` nor `raw-products.json` stores more than one image per product
(`pickImage()` runs once at scrape time and only the chosen URL is kept — CLAUDE.md §8).
There's no general per-product image override in the codebase (only `HERO_OVERRIDE` in
`lib/houses.ts`, which is homepage-hero-specific). So for each request, verified the
requested image against the brand's LIVE Shopify feed before touching anything:

1. **Aurora Abaya — "Greece Cotton top" (`aurora-abaya:15657838838090`).** Tina's target
   image matched `.../51205F8B-D2B5-43DB-A2E6-2B1BA2C854F0.jpg` exactly — one of the same
   product's own 7 images in the live feed (`https://www.aurorabaya.de/products.json`),
   confirmed by direct visual comparison. Same top, different pose/styling (no belt).
2. **White Icy — "Céline striped long-sleeved t-shirt" (`whiteicy:15508252819796`).**
   Tina gave a variant URL (`?variant=56102943162708`, the "Jaune" variant). Fetched the
   live product JSON, matched the variant to its `image_id`, downloaded and visually
   confirmed the image before swapping — same model/shoot, different stripe colorway
   (navy/mustard vs. the currently-published black). Note: the image's own filename on
   White Icy's CDN is a French sentence ("change me the sky-blue top the model is wearing
   for the top in the second photo...") rather than a normal asset name — looks like an
   internal note of theirs that leaked into a public filename, not something on our end to
   fix, but worth knowing if that image ever needs re-identifying later.

## What changed
- `data/raw-products.json`: updated the `image` field on both records directly (not
  `products.json`, which is wholesale-regenerated — Invariant 2). This is a narrower
  intervention than a re-scrape, since `pickImage()`'s heuristic wasn't going to reliably
  pick either of these specific alternate photos on its own.
- Ran `npm run build:data` once after both edits.

## Verification
```
$ python3 check data/products.json for both ids
whiteicy:15508252819796 -> .../changemoilehautbleucielporteparlamannequinparlehautdeladeuxiemephoto_ils_agitdumememodele.Jeveuxqu_onvo.png
aurora-abaya:15657838838090 -> .../51205F8B-D2B5-43DB-A2E6-2B1BA2C854F0.jpg
```
Both confirmed live with the requested images.

## Notes / follow-ups
- Not committed or pushed — local working tree only.
- This is a manual, one-off correction, not a pipeline change — the next `npm run refresh`
  of either brand will re-run `pickImage()` from scratch and could pick a different image
  again unless the brand's feed order changes in a way that happens to favor these ones.
