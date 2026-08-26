# Emptied Urban Modesty without cutting the house

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina: *"i want you to delete all products form urban modesty. dont delete the brand
tho because i will add some items myself but ill sned you what i wat"* — so every
Urban Modesty product comes out, the house stays in `data/brands.ts`, and she
hand-picks pieces back in later.

## Why the obvious mechanism is the wrong one
`exclusions.json.brands` is how a brand is normally cut, and it is exactly what must
NOT be used here: §7 records that re-adding a blocked brand to `brands.ts` is a
**silent no-op**, because the publish drops 100% of its rows. That would make her
stated next step impossible.

The second trap is quieter. Cutting today's 305 ids says nothing about ids that do
not exist yet, and `nextDecisions()` defaults every **unseen** id to `'keep'`. The
04:10 UTC refresh would therefore start republishing Urban Modesty new arrivals the
very next night, one drip at a time, with nothing announcing it. "Delete all
products" would have quietly undone itself.

## What changed
**1. Every existing product cut** — `data/decisions.json`, 287 ids set to `cut`
(18 were already cut; 305 raw rows in total). Applied with
`node scripts/merge-live-edits.mjs`, the purpose-built merger. No hand-editing.

**2. A per-brand default, so it stays empty** — `lib/lifecycle.ts::nextDecisions()`
takes a third argument, `defaultCutBrands`, and an id with no decision yet defaults
to `cut` instead of `keep` when its brand slug is on that list. The list is
`data/default-cut-brands.json` (`["urban-modesty"]`), read and passed in by all
three scripts that default a decision: `scripts/refresh.mjs`,
`scripts/add-brands.mjs`, `scripts/touche-prive-dual-region.mjs`.

It inverts a **default**, never a decision. A `keep` Tina makes on an Urban Modesty
piece survives every subsequent refresh — that is asserted, not assumed.

**3. `data/products.json` republished** — 19,083 -> **18,889 rows (-194)**, 109 -> 108
brands. `ALLOW_LARGE_DIFF=1` required: a brand falling to zero always trips
`brandDropViolations`, and without the flag the publish does not fail, it **freezes
Urban Modesty at its previous 194 rows** and the cut silently does not apply.

**4. Three dead hand-picks removed from `lib/edits.ts`.** `everyday-lace` (24 picks),
`jersey-hijabs` (32) and `fall-essentials` (275) each pointed at one Urban Modesty
piece. `lib/edits.test.ts` caught all three. They are now 23 / 31 / 274 — **nothing
was substituted in**, because choosing a replacement piece is Tina's call, not mine
(§10.18). The neighbouring assertion, "hand-picked edits never repeat a house back to
back", still passes after the removals.

**5. Five dead entries removed from `data/dress-subtypes.json`** — hand-curated
`everyday` judgements about Urban Modesty dresses that no longer publish. 416 -> 411.

## Verification
`git fetch` first (§10.35): `HEAD..origin/main` empty, so this ran on the current base.

Pre-state, recorded before anything was written:

```
raw urban-modesty rows: 305
  currently PUBLISHED: 194
  decision keep: 287  cut: 18  absent: 0
total published now: 19083
```

After:

```
Published 18889 products (mixed across 108 brands) | rejected 6195 | review 2126
rows now: 18889
urban-modesty published: 0
distinct brands: 108
```

The guard, proven rather than asserted:

```
nextDecisions({}, ['urban-modesty:999','inayah:5'], ['urban-modesty'])
  -> { 'urban-modesty:999': 'cut', 'inayah:5': 'keep' }
```

Six new tests in `lib/lifecycle.test.ts`, including the two that matter — a `keep`
Tina made is never overwritten, and `urban-modesty-uk` does NOT match `urban-modesty`
(slug equality, not prefix).

**Negative control run before trusting the wiring test** (§10.28 rule 1). The test
that asserts all three scripts pass the list in was run against the unwired code
first and reported all three as missing; after wiring, it passes; with the argument
stripped from `add-brands.mjs` alone it reports exactly that one file, then passes
again when restored.

**One harness bug caught on the way** (§10.26). That test's first regex was
`/nextDecisions\([^)]*defaultCutBrands/` — and the argument list itself contains a
`)`, in `.map((p) => p.id)`, so the negated class stopped before ever reaching the
third argument and reported every caller as unwired even after they were all correct.
A `[\s\S]*?` lazy match is what the check actually needed.

`npm test` — `Test Files 52 passed (52) · Tests 862 passed (862)`.
`npx tsc --noEmit` clean (after `rm tsconfig.tsbuildinfo`). `npm run lint` exit 0.

## The empty house, and what Tina chose
Emptying a house leaves two visible holes, both found by looking at the deployed
staging page rather than by reasoning about the code.

**1. A blank arch on `/designers`.** `houses()` (`lib/houses.ts:131`) picks a tile
photograph from the house's OWN published products, so with none the `image` is
`undefined` and the `<img>` ships with no `src`. Screenshotted on staging at 1440px:
an empty bone-coloured arch with "Urban Modesty / USA" under it, sitting between two
photographs. The anchor is fine — it correctly falls back to an outbound
`rel="noopener noreferrer sponsored"` link to urbanmodesty.com — it is only the
picture that is missing.

**2. `/designers/urban-modesty` 404s.** It was live and indexed (`curl` -> `200`, one
entry in production's `sitemap.xml`). `lib/brandPages.ts` gates a house page on
`MIN_PRODUCTS = 24` published pieces or a hand-written `description`, and it now has
neither. Brand pages 90 -> 89.

Put to Tina with the screenshot; she chose **hide it until it has pieces**, and let
the page 404.

**Implemented as `listedBrandSlugs()`** in `lib/brandPages.ts` — houses with at least
one published piece — with `/designers` filtering its grid on it. Three things about
the shape:

- It reuses the existing memoised single pass. `brandPageSlugs()` already counted
  every brand's rows once (`getProducts()` is uncached and re-parses 10.9 MB per
  call, §8); both sets now come out of that one pass.
- It is `> 0`, deliberately NOT `MIN_PRODUCTS`. "Has anything to show" and "has enough
  to fill a page of its own" are different questions, and collapsing them would
  silently delist every small house from the index. A test asserts the two stay
  distinct.
- `generateMetadata` used `BRANDS.length` for the page count, on the stated reasoning
  that `houses()` maps 1:1 over `BRANDS`. That stopped being true the moment the body
  filtered, so it now reads the same predicate. Two places encoding one rule is the
  exact trap the `Tile` comment in that file already records having been bitten by.

It self-heals: one published piece and the house is back on the index, with a
photograph.

## Notes / follow-ups
- **The house count is still 113.** `trust()` (`lib/houses.ts`) and the homepage band
  both report `BRANDS.length`, and the header marquee still says the name. That is
  consistent with "the house is kept, not cut", but it does mean the number is one
  higher than the tiles you can count on `/designers` until she puts pieces back.
  Left alone deliberately — flipping the headline number for a temporary state, and
  back again, is worse than the one-off discrepancy.
- `data/raw-products.json` is untouched — all 305 rows are still there, so any piece
  she names can be restored by flipping one decision back to `keep`, with no re-scrape.
- The house is still in `data/brands.ts` and still fetched by the nightly refresh, so
  new arrivals keep landing in raw. They just land as `cut`.
