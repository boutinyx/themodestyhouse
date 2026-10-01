# Try Modest: seed 4 pieces into New In, add the affiliate code
**Date:** 2026-10-02 · **Status:** done

## Goal
Two asks from Tina:
1. "did you put some of the trymodest items in new in? if not put these
   in [4 trymodest.com product URLs]" — no, nothing had; `try-modest`
   wasn't in `NEW_IN_HOUSES` (`lib/newIn.ts`) at all.
2. "ah wait we didnt put the affiliete links huh" — correct, no code
   existed for `trymodest.com` in `lib/affiliates.ts`. She then supplied
   `https://trymodest.com?sca_ref=12424822.QpnqoWAVS7`.

## What changed

### New In
- Added `try-modest` to `NEW_IN_HOUSES`.
- Try Modest's entire first ingest (273 published rows) carries one
  `firstSeen` day (2026-10-01) — the exact same shape as Losyana's
  `.shop` migration, so `ingestBatchDays`' de-batching would otherwise
  exclude 100% of it, same as Losyana. Tina asked for four SPECIFIC
  pieces, not "whatever's newest" (which is what the existing
  `SEED_HOUSE`/`SEED_POSITIONS` mechanism does for Losyana) — so added a
  second, pinned-by-id seed: `TRY_MODEST_SEED_IDS` (4 real published ids,
  matched from the pasted URLs' handles) and
  `TRY_MODEST_SEED_POSITIONS` (`5, 11, 17, 23` — gaps of 6, same spacing
  logic as Losyana's `2, 8, 15, 21`, re-measured against the same 2-col
  phone / 3-col 768px+ grid, none consecutive).
- Rewrote `seed()` to merge BOTH seed groups into one ascending-by-position
  splice pass rather than running them one after another — doing it
  sequentially would shift one group's positions by the other group's
  length whenever their ranges interleave (they do: 2,5,8,11,15,17,21,23),
  which breaks the exact invariant the existing Losyana test pins.
- Added 3 tests mirroring the existing Losyana-seed tests, covering: both
  groups landing correctly together, the fully-batched house getting
  nothing beyond its 4 pins, and the positions being non-consecutive.

### Affiliate
- Added `trymodest.com: { sca_ref: '12424822.QpnqoWAVS7' }` to
  `lib/affiliates.ts`'s `BY_HOST` map.
- Per the file's own standing rule (never add a code without verifying
  it's real and live, after the Losyana wrong-store incident), checked
  this one in an actual browser rather than curl — the tracking cookies
  are set by the affiliate app's own JS, not a `Set-Cookie` header, so
  curl shows nothing. Confirmed: `scaaf_aid=12424822`,
  `scaaf_hc=QpnqoWAVS7`, and `scaaf_afn`/`scaaf_affn` both resolve to
  "Tina Aouled" / "Tina" — the id is genuinely hers. Platform is
  "Secomus" (cookie prefix `scaaf_`), not the UpPromote link from the
  2026-09-17 outreach draft — she must have registered with Secomus
  instead, or in addition.

## Verification
- `npx tsc --noEmit` clean.
- `npx vitest run lib/newIn.test.ts`: 18/18 (15 pre-existing + 3 new).
- Ran the REAL catalogue through `newInProducts()`: all four Try Modest
  picks land at positions 5/11/17/23 with the correct ids and titles;
  Losyana's existing seed still lands at 2/8/15/21 unchanged.
- `withUtm('https://trymodest.com/products/isla-button-front-nida-abaya',
  'product-card')` → carries both `sca_ref` and the full UTM set, in the
  order the file's own comment says they must apply (affiliate first,
  never overwritten by a utm check).
- Full suite: 1330 passed, 1 pre-existing unrelated failure
  (`lib/colourLeads.test.ts`, stale `lameera-moda` id, confirmed earlier
  this session on `main` too). `npm run build` clean.

## Notes / follow-ups
- `TRY_MODEST_SEED_IDS`/`POSITIONS` are a one-off, like Losyana's — if
  the grid's column count ever changes, re-measure, same warning the
  Losyana comment already carries.
