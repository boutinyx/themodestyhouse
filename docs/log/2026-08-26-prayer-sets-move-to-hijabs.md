# Prayer sets move from Layering Basics to Hijabs & Scarves
**Date:** 2026-08-26 · **Status:** done

## Goal
Tina: *"put prayer sets under hijabs."* Asked whether that meant the menu link or
the products, since the two are very different in scope — she chose **the
products**.

## What changed

`lib/specialty.ts` is where the decision lives:

- **New `isPrayer()`** — the same broad, garment-agnostic `PRAYER_RE` rule as
  before (her 2026-08-15 call: "every prayer-titled product, all garments"), so
  the SET of products is unchanged; only the lane they land on moves.
- **`isLayering()`** opened with `if (PRAYER_RE.test(title)) return true` — an
  explicit exception added 2026-08-15. It now returns **false**, and stays first
  for the same reason it was first before: prayer-set titles also match
  `LAYERING_RE` and `UNDER_DRESS_RE`, so without an early exit they would fall
  through and land back on Basics.
- **`isSpecialty()`** gains `isPrayer`. This is load-bearing, not tidy-up:
  `productsForLane` strips specialty items from every non-specialty lane, and
  it is the only thing keeping prayer wear out of the everyday grids now that
  `isLayering()` no longer claims it. **Without that line the move would have
  quietly published 188 prayer pieces into /modest-abayas and /modest-skirts.**
- **`hijabSubtype()`** gains `prayer-set`, checked FIRST. Prayer titles very
  commonly also say jilbab or khimar ("Two-Piece Jilbab / Prayer Set Dress"),
  and she asked for Prayer Sets as their own group, so prayer wins the overlap.
- `LAYERING_SUBTYPE_LABELS` / `layeringSubtype()` lose `prayer-set`;
  `HIJAB_SUBTYPE_LABELS` gains it. `lib/lanes.ts`'s modest-hijabs match gains
  `|| isPrayer(p)` — a separate route-in because most prayer wear is not
  jilbab/khimar/undercap by title.

### The 22 hand-picked overrides, and why they needed care
`data/lane-overrides.json` pins 22 rows to `{lane: 'layering-basics', subtype:
'prayer-set'}` — real prayer sets whose titles say nothing about prayer
("Salma", "Shara Mukena Set", "Golden Nujum set", "Black Nujum set"), so the
regex cannot find them. `isLayering()`'s `forcedLane` short-circuit would have
won and stranded all 22 on Basics, splitting prayer wear across two lanes.

That pairing is baked into `data/products.json` at PUBLISH time, so it is on the
rows today. `isPrayer()` therefore reads the **subtype** rather than the lane:
the staff decision recorded there was "this is a prayer set", which is still
true — only the lane prayer sets live on changed. No republish needed.

**Deferred, and stated rather than buried:** `ForcedLane` has no
`'modest-hijabs'` member, so those 22 entries cannot yet be rewritten to point
at the new lane. Doing it properly needs `ForcedLane` extended,
`scripts/build-data.mjs` updated, the entries rewritten and a republish. Until
then the raw-string comparison in `isPrayer()` is what holds it together, and
that is why `'prayer-set'` is compared as a string — it is no longer a member of
`LayeringSubtype`.

## Verification

Measured before and after, from the real catalogue:

| lane | before | after | |
|---|---|---|---|
| modest-hijabs | 5030 | **5218** | +188 |
| layering-basics | 502 | **314** | -188 |
| modest-abayas | 4972 | 4972 | 0 |
| modest-skirts | 1140 | 1140 | 0 |
| modest-dresses | 2901 | 2901 | 0 |

- 188 prayer rows total, **0 not on the hijab lane**, **0 leaking into browse
  grids**, **0 hijab-lane rows with a null subtype** (which would mean an item
  on the page but absent from every Type filter option).
- Hijab subtype split now: hijab 4581 · undercap 320 · prayer-set 188 ·
  khimar-jilbab 129.
- Nav: "Prayer Sets" renders under Hijabs, linking `/modest-hijabs?type=prayer-set`;
  the lane page's `h1` reads "Prayer Sets".
- **Redirect added** (`next.config.ts`): `/layering-basics?type=prayer-set` 308s
  to the new URL. Without it that address does not 404 — `resolveSubtype()`
  returns null and the page falls back to the plain Basics lane, which is worse
  than a 404 for a URL that was in `sitemap.xml`, since Google would keep an
  indexed address now showing unrelated products. Verified: `308 ->
  /modest-hijabs?type=prayer-set`, and plain `/layering-basics` still 200.
- 5 tests asserted the old rule. **Rewritten to assert the new one, not
  deleted** — the property worth guarding (a title matching both concepts lands
  on exactly one lane) still holds, just in the other direction. Two new tests
  added: prayer wear whose title says nothing about hijab, and the
  prayer-beats-khimar ordering. **791 tests pass** (was 781).

## Notes / follow-ups
- `npx tsc --noEmit` reports errors in `components/DesignerDiscovery.tsx`, a
  concurrent session's file mid-edit. **Zero errors outside it**, none in
  anything touched here; it is not staged in this commit.
- Caught myself reading a stale `/tmp` log: `tsc && npm test` short-circuited on
  their file, so the test run never happened and the "5 failed" I first saw was
  the previous run's output. §10.20 again. Re-ran the suite on its own.
