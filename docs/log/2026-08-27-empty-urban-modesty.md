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

## Open decision for Tina — `/designers/urban-modesty`
It is **live and indexed today** (`curl` -> `200`, and it appears once in
production's `sitemap.xml`). `lib/brandPages.ts` gates a house page on
`MIN_PRODUCTS = 24` published pieces or a hand-written `description`; Urban Modesty
has neither now, so the page **404s** and leaves the sitemap the moment this deploys.
Brand pages 90 -> 89.

Not decided here, because it is an editorial/SEO call:
- **leave it 404ing** — correct if she expects to put 24+ pieces back, since the page
  returns on its own;
- **308 it to `/directory`** (the pattern `/hijabi-outfits` already uses in
  `next.config.ts`) — better for a URL Google already knows, and the honest choice if
  she plans to keep only a handful of pieces.

Same question is already open for `/designers/mariams`; whatever she picks should
probably cover both.

## Notes / follow-ups
- `data/raw-products.json` is untouched — all 305 rows are still there, so any piece
  she names can be restored by flipping one decision back to `keep`, with no re-scrape.
- The house is still in `data/brands.ts` and still fetched by the nightly refresh, so
  new arrivals keep landing in raw. They just land as `cut`.
