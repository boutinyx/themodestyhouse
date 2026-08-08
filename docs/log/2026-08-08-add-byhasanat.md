# Add ByHasanat (UK) to the catalogue
**Date:** 2026-08-08 · **Status:** done

## Goal
Tina asked for `byhasanat.co.uk` to be added.

## Verification before adding
- Live Shopify store, `products.json` → 200, **122 products** (page 2 empty).
- **Photography:** 513 images, 4.2 per product, **489/513 portrait**, widths
  576–4284px (median 1800), and **zero products without an image**.
- **Shipping: worldwide.** Quoted from `/pages/shipping`: *"We ship worldwide
  from the UK using DPD, Evri or FedEx, depending on the destination."* Customs
  duties are the buyer's.
- Prices £5–£139 (median £35) — accessible but not fast-fashion.

## The part that needed care: they also sell men's and children's
Their nav is Womens / Mens / Children, which is a women's-only-catalogue problem.
Rather than judging by title — the mistake recorded in the log about men's items
with gender-neutral names — the collections were used as the source of truth:

```
/collections/mens  -> 4   all product_type 'Thobe'
/collections/boys  -> 4   all product_type 'Children Thobe'
product_type counts also showed 'Children Abaya' x7
```

All 15 carry `Thobe` or `Children` in `product_type`, which `EXCLUDE` in
`lib/normalize.ts` matches, so they are dropped at normalize time — before they
ever reach `raw-products.json`.

## Verification after ingest
```
upserted by-hasanat: 0 updated, 103 new        (122 in feed -> 19 dropped at normalize)
Published 11203 products (mixed across 60 brands)
by-hasanat published: 76
men/kids rows that slipped through: 0
raw rows containing thobe/children: 0
garments: hijab 38, dress 19, abaya 15, set 2, top 2
possible non-apparel: none  (the "Waffle Knit Pouch" did not publish)
```
The auto-selected image was downloaded and viewed: a real on-model hijab shot.

`vitest` 390 passed (19 files) · `next build` compiled.

## A wrong expectation, corrected
The published total moved 11,125 → 11,203 (+78) without tripping a guard, which
looked like a regression against the **old** total-count drift ratchet (>40).
Reading `build-data.mjs` showed a concurrent session has since **replaced** that
guard with a per-brand collapse check — it now catches an individual brand's feed
dying rather than any movement in the total. Adding a brand legitimately does not
trip it. The new design is the better one; the expectation was stale, not the code.

## Notes / follow-ups
- 76 of 122 published: 19 dropped as men's/children's, the rest by out-of-stock,
  exclusions or the non-apparel veto. Worth a glance at `rejected.json` if any
  womenswear looks missing.
