# 108 of 113 brand pages were 404ing
**Date:** 2026-08-24 · **Status:** done

## Goal
Found while answering a question about editorial traffic: `/designers/merrachi` returns
**404**. So did 107 other houses. Only 5 of 113 brand pages existed.

## Root cause
`app/designers/[slug]/page.tsx` generated a page only for a house carrying a hand-written
`description` in `data/brands.ts`. Five have one. `app/sitemap.ts` restated the same
predicate, so the 5 were also the only ones listed.

The gate's two stated reasons were both legitimate:
1. **Thin content** — a page of derived data over 3 products is what `/product/[...]` was
   noindexed to avoid.
2. **Never ship invented copy about a real company** (CLAUDE.md §10.18).

Neither of those is actually *"a human wrote a paragraph"*. (1) is a question of how much
the house has, and (2) is satisfied by not rendering prose that doesn't exist.

## What this was costing
`merrachi` as a search term is **~1.9x the volume of the phrase "modest fashion"**
(21.17 vs 10.87, Google Trends, 12 months, shared scale), and is the #1 related query for
`hoofddoek` in the Netherlands. `inayah` is 0.7x. The directory served **404** for both
kinds of query — one of which it is better placed to answer than anyone.

That the format works was already proven in Search Console: **`glow modesty` sits at
position 6** — page one — and `glow-modesty` is one of the five pages that existed.
Same domain, same age, same authority as the pages stuck at position 60.

## What changed
**`lib/brandPages.ts`** — new. One predicate, imported by both the route and the sitemap,
because those are precisely the pair that must not drift (the §8 orphan landmine that
`app/sitemap.ts`'s own comment describes).

- `MIN_PRODUCTS = 24` — one full grid. `FilterableGrid` renders 24 rows before "show
  more", so a house below this cannot fill the page it is handed. That is the real
  thin-content test the `description` gate was standing in for.
- A house with a description is kept regardless, so adding one can only ever ADD a page.
- Counted in **one pass** over the catalogue and memoised. Deliberately not
  `BRANDS.map(b => productsForBrand(b.slug))`: `getProducts()` is uncached and re-parses
  the whole 10.9 MB `products.json` per call (§8), so the obvious version would parse it
  113 times per build.

**`app/designers/[slug]/page.tsx`** — uses the shared predicate; renders the description
paragraph only when one exists; metadata and JSON-LD fall back to **measured** facts
(piece count, city) rather than generated prose.

**`app/sitemap.ts`** — same predicate, imported.

## Verification
`npx tsc --noEmit` clean · `npx eslint` on all three files clean · `npm run build`
compiled, 128 static pages generated (was 40-ish).

Served on :3244:
```
sitemap total URLs : 128   (was 40)
sitemap /designers/:  91   (was  5)

/designers/merrachi -> 200   (was 404)
/designers/losyana  -> 200   (was 404)
/designers/vela     -> 200   (was 404)
/designers/noureen  -> 200   (was 404)
/designers/inayah   -> 200   (unchanged, has a description)

/designers/abadia   -> 404   (1 product — correctly still excluded)
/designers/oomah    -> 404   (2 products)
/designers/zayda    -> 404   (2 products)

/designers/vela — 3,478 words of rendered text with no description written
```
91 of 113 houses now have a page; the 22 excluded are genuinely thin (three have zero
published products).

`npm test` — 1,323 passed, 2 failed, both in another session's worktree
(`.claude/worktrees/jiggly-hugging-honey/`), unrelated.

## Notes / follow-ups
A description is now an **enhancement**, not the price of admission. The 84 pages without
one stand on measured facts. Writing real descriptions is still worth doing — it is just
no longer the thing standing between the directory and 108 indexable pages.

Two slugs are not what you would guess and cost me a false 404 in testing: Vela Scarves is
`vela`, NOUREEN Modest Fashion is `noureen`.
