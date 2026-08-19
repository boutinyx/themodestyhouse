# Brand pages at /designers/[slug]
**Date:** 2026-08-19 · **Status:** done (5 houses)

## Goal
Tier 3 item B of the SEO audit. 113 brands, zero pages: every `/designers` tile
linked straight off-site, so the page passed all its ranking signal away, and the
editorial could name a house — *"Veiled is the one that actually does. No notes."* —
without being able to link it.

## The two questions the audit said to settle first

**1. Which product accessor.** `browseProducts()` strips hijabs and swim/activewear
(Invariant 5), which would have rendered a Veiled page missing 274 of its 782 pieces
and a Haute Hijab page that was nearly empty.

Resolved with a new `productsForBrand(slug)` on `getProducts()`. This is the correct
reading of Invariant 5, not an exception to it: that invariant governs **mixed** grids,
where hijabs and specialty are held back because they have their own lanes. A house page
is not a mixed grid — it is one house's own range, and hiding part of it misrepresents
the house.

**2. Sitemap.** `app/sitemap.ts` now maps the family, gated on the **same predicate the
route uses**, so the two cannot drift: adding a description publishes a page *and* lists
it; removing one does both in reverse. This is the §8 landmine — `/editorial/[slug]` was
silently unlisted for months while the file looked self-maintaining.

## The gate
`Brand.description` is optional and load-bearing. A house without one gets **no page and
no sitemap entry**. One condition, two jobs:

- **Thin content.** 5 brands have under 10 published products and 21 have under 25 —
  thinner than a single grid. A page of derived data over 3 products is exactly the
  pattern `/product/[...]` was noindexed to avoid.
- **§10.18.** Nothing about a real company ships without a human having written words
  about it.

It also makes the whole feature trivially reversible: delete a `description` and that
page and its sitemap entry both disappear.

## Descriptions
Five sealed houses (veiled, aab, inayah, glow-modesty, summer-evenings), drafted from
**measured catalogue facts only** — piece counts, real price ranges in each house's own
currency, what the range actually consists of. They deliberately carry **no judgement**
about whether a house is good: that is Tina's, and it is the entire reason the seal means
anything. Each is one sentence short of finished, and the missing sentence is hers.

Prices are never converted (ADR-0002); each house's range is quoted in its own currency.

## Schema
`brandPageSchema()` puts the **Brand in `about`** and the listing in `mainEntity`, keeping
"this page is about a brand" separate from "here is a list". Entries are **bare
ListItems** — deliberately not `Product`, because `05563fe` removed exactly that typing
across 14 pages hours earlier after a live GSC inspection returned *"24 invalid items:
offers, review or aggregateRating must be specified"*. Verified 0 Product nodes on the
rendered page.

## Linking
`/designers` tiles now point **internally** where a page exists and outbound where it does
not. The `rel="sponsored"` outbound link moves to the brand page itself
(`data-surface="brand-page"`) — one clear destination per link rather than a tile trying to
be both.

## Verification
```
npx tsc --noEmit             exit 0
npx vitest run               713/713 (5 new in lib/brandPages.test.ts)
npm run build                40/40 static, /designers/[slug] present
audit:interaction            0 problems
audit:mobile                 0/9 overflow, a11y 0, stacked 0, aspect 0 — both engines
```
Live against `next start`:
```
/designers/veiled            200 · h1 "Veiled" · 782 pieces
/designers/aab               200 · 678       /designers/inayah   200 · 24
/designers/glow-modesty      200 · 161       /designers/summer-evenings 200 · 158
/designers/haute-hijab       404  (no description — the gate works)
sitemap                      5 brand URLs listed
schema                       Breadcrumb Home > Designers > Veiled;
                             CollectionPage about=Brand -> veiled.com;
                             ItemList 24 bare ListItems; Product nodes 0
/designers tiles             5 internal, 30 tiles total
```

## Notes
- **Inayah has 24 published pieces.** Thin enough to be worth checking the feed is
  scraping fully before treating that page as representative.
- A regex-driven bulk edit to `data/brands.ts` dropped a comma on the first attempt and
  broke the file. Caught by `tsc` immediately, reverted with `git checkout --` after
  confirming the file had no other uncommitted work, and redone. `lib/brandPages.test.ts`
  now carries a cheap guard against that class.
- Not committed here, and not mine: `content/editorial/best-abaya-brands-price-tiers.md`
  (a new post, untracked at time of writing), plus `components/Markdown.tsx` and
  `scripts/gen_hero.py` from other sessions.
