# Catalogue refresh — product lifecycle (delist / new arrivals / re-derive)
**Date:** 2026-08-05 · **Status:** done

## Goal
The catalogue was a one-shot snapshot. Products deleted by a brand stayed published as dead
links forever; products added by a brand never appeared; price/stock/image changes never
landed. Raw rows carried no timestamps, so a stale row was indistinguishable from a fresh one.

Design: `docs/superpowers/specs/2026-08-05-catalogue-refresh-design.md`.

## What changed

**New — `lib/lifecycle.ts`** (+ `lib/lifecycle.test.ts`, 36 tests)
Every lifecycle rule, as pure functions with no network and no filesystem:
`isCompleteFetch`, `applyBrandRefresh`, `nextDecisions`, `isLifecycleLive`, `stripLifecycle`,
`brandDropViolations`. Isolated deliberately — a wrongly-hidden product raises no error and
prints nothing red, so tests are the only thing that can catch that class of bug (§10.12).

**New — `lib/ingest.ts`** (+ `lib/ingest.test.ts`, 7 tests)
Feed pagination with an injected page fetcher, so completeness accounting is testable
without a network. `classifyFeed` splits a feed into publishable rows and rows our own
filters rejected. Shared by `refresh.mjs` and `add-brands.mjs` so the rules exist once.

**New — `scripts/refresh.mjs` / `npm run refresh [slug…]`**
Backs up `raw-products.json` first, backfills `firstSeen: null` on pre-tracking rows, then
per brand: re-derives everything the brand still sells, adds new arrivals, stamps
`delistedAt` on anything absent from a *complete* fetch, stamps `filteredAt` on anything the
brand still sells that our filters reject. Checkpoints after each brand (§10.7), then runs
`build-data` itself (§10.8).

**`lib/normalize.ts`** — added `normalizeProductDetailed()`, which reports *why* a row was
rejected (`no-image` / `excluded-title` / `unclassified`). `normalizeProduct` is now a thin
wrapper over it and is unchanged behaviourally. This is what lets a merchant deleting stock
be told apart from our own classifier dropping rows.

**`scripts/add-brands.mjs`** — rewritten onto the shared modules. Two bug fixes:
- It no longer writes `decisions[id] = 'keep'` unconditionally. That line resurrected every
  product Tina had cut, on every ingest of that brand — the exact failure Invariant 3 warns
  about, in the code causing it.
- It refuses to run with no arguments instead of silently falling back to six default slugs.

**`scripts/build-data.mjs`** —
- Publish predicate now also requires `!delistedAt && !filteredAt`.
- The global `Math.abs(published - prev) > 40` ratchet is replaced by a per-brand collapse
  guard. The old one would have tripped on every genuine refresh, and let a dying brand hide
  behind other brands' gains.
- Strips lifecycle fields at publish (~150 KB off `products.json` *and* off every RSC payload).
- `filteredAt` rows go to `review.json` with their reason; delists are counted separately.

**`lib/normalize.test.ts`** — fixed the pre-existing TS2739 (the `Brand` fixture was missing
`category`, `city`, `vibe`). `npx tsc --noEmit` is now clean, which unblocks the `typecheck`
script proposed in §12.

Also: `package.json` (`refresh` script), `.gitignore` (`data/.backups/`).

## Verification

Full suite, up from 176 to 219 tests:
```
$ npx vitest run
 Test Files  8 passed (8)
      Tests  219 passed (219)
```

Typecheck, previously 1 known failure:
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
(exit 0)
```

Publish against real data, unchanged output:
```
$ npm run build:data
Published 6414 products (mixed across 32 brands) | rejected 3018 | review 41 | delisted-by-brand 0
```

Live end-to-end run against a real brand feed:
```
$ npm run refresh sei-sorelle
Backup: data/.backups/raw-products.2026-08-05T11-20-26-840Z.json (7.5 MB)
Backfilled firstSeen=null on 13627 pre-tracking rows.
Sei Sorelle (sei-sorelle)...
  fetched 20 | +0 new | 20 updated | -0 delisted | 0 filtered | 0 returned
Published 6414 products (mixed across 32 brands) | ... | delisted-by-brand 0
```

Field placement after that run — lifecycle data is raw-side only:
```
refreshed raw row: {"id":"sei-sorelle:7095557292113","firstSeen":null,"lastSeen":"2026-08-05","delistedAt":null,"filteredAt":null}
untouched raw row: {"id":"inayah:10356967932184","firstSeen":null}
lifecycle fields leaked into products.json: 0
raw rows total: 13627   (unchanged — nothing deleted)
```

The delist path did not fire above (nothing had actually been removed at that brand), so it
was proven separately by injecting a synthetic row the brand does not sell, refreshing, then
removing it:
```
  fetched 20 | +0 new | 20 updated | -1 delisted | 0 filtered | 0 returned
Published 6414 products | ... | delisted-by-brand 1
probe row retained, not deleted: true
  delistedAt = 2026-08-05 | lastSeen = 2026-01-01 (unchanged, correct)
  in products.json: false
```
Hidden from the site, retained in raw so it can return, and `lastSeen` untouched because we
did not see it.

## Notes / follow-ups
- **The first full `npm run refresh` will be a big one** and has never been run. It will
  re-derive ~11k rows against the current `pickImage`, which per §10.12 is the only way that
  fix reaches existing data — expect a large number of image changes, and expect the
  per-brand guard to challenge at least one brand. Read `data/refresh-report.json` before
  passing `ALLOW_LARGE_DIFF=1`.
- Not automated. Scheduling stays blocked on P0-B (no git remote, `raw-products.json`
  gitignored and unbacked) — the refresh command is written to be callable unattended once
  that is solved.
- No pruning of long-delisted rows; `raw-products.json` grows monotonically. Deliberate.
- `firstSeen` now exists and would support a real "New In" rail, replacing some of the
  hardcoded fake editorial (§8). Not built.
- `data/.backups/` is gitignored and never cleaned automatically — housekeeping is manual.
