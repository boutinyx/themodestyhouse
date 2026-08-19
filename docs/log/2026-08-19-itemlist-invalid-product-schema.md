# Every lane page emitted 24 invalid Product nodes; ItemList is now bare ListItems
**Date:** 2026-08-19 · **Status:** done

## Goal
Tina ran a live URL inspection on `/modest-skirts` in Search Console and got:

> **24 ongeldige items gedetecteerd** — `'offers', 'review' of 'aggregateRating' moet zijn
> gespecificeerd` · type `Product` · name `Mauve Chalk Printed Pleated Maxi Skirt`

Find out what is emitting it and fix it.

## What it was
`collectionPageSchema()` in `lib/schema.ts` wrapped every one of the 24 listed cards in a
nested `item` typed `'@type': 'Product'`, carrying only `name`, `brand`, `url` and `image`.
Google's Product spec requires at least one of `offers` / `review` / `aggregateRating`; with
none of them, every node is invalid. It affected all 13 lanes **and** `/directory` — 14
pages × 24 = **336 invalid items sitewide**, not just the page Tina happened to inspect.

The file's own header records why prices are absent (`docs/launch-readiness.md`: stale prices
in structured data risk a manual action), and its `brandListSchema` comment had already
articulated the exact objection — "emitting one would assert that 'Aab' is a purchasable item
with no offers, price or availability" — without anyone noticing it applied to the products
too.

## Why the fix is subtraction, not `offers`
Two escape routes were checked against Google's actual documentation rather than assumed:

1. **Add `offers`.** Rejected — it reverses the deliberate no-prices-in-structured-data
   decision, and the prices are the ones we already decline to publish this way.
2. **Point the url at our own product page.** `/product/[brandSlug]/[shopifyId]` does exist
   now, but is deliberately `noindex` for Google/Bing (see that file's header and
   `docs/log/2026-08-17-product-page-noindex-blocked-pinterest.md`), so it is not a
   legitimate ItemList target either.

Google's summary-page spec was then read directly
(`developers.google.com/search/docs/appearance/structured-data/carousel`): a ListItem needs
only `position` + `url`, and **"All URLs in the list must be unique, but live on the same
domain (the same domain or sub/super domain as the current page)."** Ours are the brand's own
storefront. So these pages were never eligible for a carousel rich result under *any* typing
— the `Product` claim bought nothing and asserted something false about 336 items.

## What changed
- `lib/schema.ts` — `itemListElement` entries are now bare `ListItem`s (`position`, `name`,
  `url`, `image`). `ListedItem.brandName` removed, since nothing reads it any more (§10.33:
  don't accept a field you don't use). Both the function docstring and the `brandListSchema`
  comment rewritten to say what is now true.
- `app/[lane]/page.tsx`, `app/directory/page.tsx` — stop passing `brandName`.
- `lib/schema.test.ts` — new regression test `never types a listed item as a Product`,
  written before the fix and confirmed failing on the old code (evidence below). The two
  existing tests were updated for the flattened shape.

The ItemList is kept rather than deleted: it is still the machine-readable statement of what
the page contains, which is what an AI crawler reads.

## Verification
Regression test failing on the UNFIXED code (negative control, per §10.28 rule 1):
```
Expected: "Product"
Received: "{"@type":"ListItem","position":1,"item":{"@type":"Product","name":"Item 0",
           "brand":{"@type":"Brand","name":"Brand"},"url":"https://brand.example/products/item-0",...}}"
 ❯ lib/schema.test.ts:64:38
 Test Files  1 failed | 1 passed (2)   Tests  2 failed | 21 passed (23)
```
After the fix:
```
$ npx vitest run lib/schema.test.ts
 Test Files  2 passed (2)      Tests  23 passed (23)

$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit    → exit 0

$ npx vitest run --root . --exclude '**/.claude/**'
 Test Files  43 passed (43)    Tests  709 passed (709)
```
End-to-end, building the graph exactly as `app/[lane]/page.tsx` does, over the real
catalogue:
```
$ npx tsx proof.ts
items emitted: 24
occurrences of "Product": 0
first ListItem: {
  "@type": "ListItem", "position": 1,
  "name": "Maxi Broche Skirt- Beige",
  "url": "https://bemutr.com/products/maxi-broche-skirt-beige",
  "image": "https://cdn.shopify.com/s/files/.../B925.jpg?v=1784283553"
}
```
`npm test` unfiltered reports 2 failures — `lib/aboutStats.test.ts` and `lib/devOnly.test.ts`
inside `.claude/worktrees/jiggly-hugging-honey/`, another session's worktree that vitest picks
up from the repo root. Not touched, not caused by this change; every test in this checkout
passes.

No `next build` was run: another session is live in this working tree and `.next` is shared
(§10.28 rule 4). The proof above exercises the same function the page calls, with the same
inputs.

## Notes / follow-ups
- This is **not** the fix for the five unindexed lanes
  (`docs/log/2026-08-19-gsc-index-coverage-diagnosis.md`). Invalid structured data costs rich
  results, not indexing. Two separate problems that happened to surface in the same console.
- Google will not re-report these as valid until it recrawls. Expect the "ongeldige items"
  count to fall over days, not on deploy.
- Worth considering separately: if `/product/*` ever becomes indexable, the same-domain
  requirement is satisfied and a real carousel becomes available. That is a bigger editorial
  decision (the 2026-08-05 thin-content revert) and is not implied by this change.
