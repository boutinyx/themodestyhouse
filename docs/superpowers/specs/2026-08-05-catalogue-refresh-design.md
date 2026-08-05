# Catalogue refresh — product lifecycle design

**Date:** 2026-08-05 · **Status:** approved, ready to implement

## Problem

The catalogue is a one-shot snapshot. `scripts/add-brands.mjs` upserts by product id and
never deletes (Invariant 12), so once a row lands in `data/raw-products.json` it survives
forever with whatever values it had at ingest time. Consequences, all verified in code:

| Event at the brand | Current behaviour |
|---|---|
| Product deleted from feed | Row untouched, `inStock` frozen `true` → **published as a dead link indefinitely** |
| Product sells out | `inStock` only refreshes if that brand is re-scraped |
| Price / title / image changes | Frozen at ingest |
| New product added | Never appears until someone manually runs `add-brands.mjs <slug>` |

Compounding: `add-brands.mjs:80` writes `decisions[p.id] = 'keep'` unconditionally, so any
product previously **cut** is silently resurrected by the next ingest of its brand — the
failure Invariant 3 warns about, in the code that causes it.

Underneath all of it: raw rows carry **no timestamps**. Verified keys are
`id, brandSlug, brandName, title, price, currency, image, url, inStock, garment, community,
occasion, season, activity`. There is no `firstSeen`/`lastSeen`, so a stale row is currently
indistinguishable from a fresh one. 13,627 raw rows span 40 brand slugs (vs 32 in `BRANDS`
— the six cut brands' rows plus drift).

## Goals

1. Products removed by a brand stop being published.
2. Products added by a brand start being published.
3. Price / stock / image / tags re-derive on every refresh — which is also the only
   mechanism by which a `lib/normalize.ts` or `lib/tag.ts` fix ever reaches existing rows
   (§8, §10.12).
4. Classifier regressions are distinguishable from ordinary merchant churn.
5. Nothing above can lose data, including when the network fails halfway.

## Non-goals (explicit)

- No scheduled/unattended execution yet — blocked on P0-B (no git remote, raw unbacked).
  The command is designed so a scheduler can call it later without redesign.
- No pruning of long-delisted rows. Rows are kept forever.
- No "New In" rail. `firstSeen` makes one possible later; not built here.
- Sold-out behaviour unchanged: `inStock: false` unpublishes, it does not render greyed-out.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Manual `npm run refresh`, built to be automatable later | No infra needed now; P0-B unresolved |
| D2 | A product absent from a **complete** fetch is hidden immediately, row retained | A dead link is a worse visitor-facing failure than a briefly-missing product; retention makes hiding reversible |
| D3 | New products auto-publish, every new title listed in the report | The non-apparel veto + `exclusions.json` already do the real filtering; a hold-for-approval queue leaves new stock invisible until reviewed, and `/admin/curate` has no auth (P0-A) |
| D4 | Existing decisions are never overwritten | Fixes the resurrection bug; honours Invariant 3 |
| D5 | Rows rejected by *our own* filters are tracked separately from delists | 3 is churn, 300 is a broken regex — indistinguishable if merged |
| D6 | The global ±40 drift ratchet is replaced by a per-brand guard | Totals let a dying brand hide behind other brands' gains |

## Architecture

```
scripts/refresh.mjs        orchestration + network + reporting  (no rules)
  ├── lib/ingest.ts        feed fetching, pagination, complete-fetch contract
  ├── lib/lifecycle.ts     PURE rules: stamping, publishability, decision-writing, guards
  └── lib/normalize.ts     + normalizeProductDetailed() — reports WHY a row was rejected
scripts/build-data.mjs     consumes lifecycle fields; per-brand guard; strips fields at publish
```

`lib/lifecycle.ts` holds every rule and touches no network and no filesystem, so all of it
is unit-testable. This is the load-bearing structural choice: a wrongly-hidden product
produces no error and no red text — it is simply absent — so tests are the only thing that
can catch this class of bug (§10.12).

`add-brands.mjs` is refactored onto the same `lib/ingest.ts` + `lib/lifecycle.ts`, so there
is one implementation of the rules rather than the verbatim duplication §8 already flags
between `build-data.mjs` and `lib/exclude.test.ts`.

### Data model

Four fields added to raw rows only (`data/raw-products.json`), typed as an optional
`ProductLifecycle` extension in `lib/types.ts`:

| Field | Type | Meaning |
|---|---|---|
| `firstSeen` | `string \| null` | ISO date first ingested. Existing 13,627 rows backfill to `null` = "pre-dates tracking". Written only when the **key is absent** — an explicit `null` is a real value and is never overwritten |
| `lastSeen` | `string` | ISO date of the last fetch (complete **or** partial) that contained it. Partial fetches are still evidence of presence; they are only barred from proving *absence* |
| `delistedAt` | `string \| null` | Set when a complete fetch omitted it; cleared on return |
| `filteredAt` | `string \| null` | Set when the brand still lists it but our filters reject it |
| `filterReason` | `string?` | `no-image` \| `excluded-title` \| `unclassified` |

`build-data.mjs` **strips all five at publish**. Rows with `delistedAt` or `filteredAt` never
publish so those cannot leak; `lastSeen`/`firstSeen` on ~5,000 published rows would add
~150 KB to `products.json` *and* to every RSC payload, which §8 names as the real scaling
ceiling.

Publish predicate becomes:

```
decisions[id] === 'keep' && inStock && !delistedAt && !filteredAt && !excluded && !nonApparel
```

### The complete-fetch contract

Delisting is gated entirely on this, so it is defined strictly. A fetch is **complete** iff:

1. Pagination reached a natural end (a page returned zero products), **and**
2. no page gave up after 429 retries, **and**
3. no page returned a non-OK status, **and**
4. the 20-page loop cap was **not** reached.

Condition 4 is a live bug being fixed: `add-brands.mjs:42` loops `page <= 20` and, on
exhausting the cap, still reports `complete: true`. At 250/page that mislabels any brand
over 5,000 products as fully fetched — and under this design "complete" is a licence to
delist.

An **incomplete** fetch adds and updates normally and stamps **no** `delistedAt`. This is
Invariant 12's intent made explicit rather than implicit, and is the direct guard against
repeating §10.1.

### Refresh algorithm

```
snapshot data/raw-products.json → data/.backups/raw-products.<ISO>.json   (before any write)
for each brand in BRANDS:
    fetch feed → { shopifyIds, normalized[], rejected[{id, reason}], complete }
    for each normalized row:      upsert; lastSeen = today; clear delistedAt/filteredAt;
                                  if !('firstSeen' in existing) firstSeen = today
    for each rejected row:        filteredAt = today; filterReason = reason
    if complete:                  every existing row for this brand whose id was absent
                                  from shopifyIds  →  delistedAt = today
    decisions: if (!(id in decisions)) decisions[id] = 'keep'      // never overwrite
    write raw + decisions                                          // checkpoint per brand
    accumulate report row
write data/refresh-report.json
run build-data
```

Per-brand checkpointing means a killed run keeps completed work and is resumable (§10.7).
Chaining `build-data` means ingest and publish stay one operation (§10.8).

### Guards

Replaces the global `Math.abs(published - prev) > 40` ratchet in `build-data.mjs:130`:

- **Per-brand floor:** throw if any brand loses >30% of its previously published products
  *and* loses ≥5 (so a 3-product brand cannot trip on one loss).
- **Zero floor:** throw if a brand that previously published >0 now publishes 0.
- Override: `ALLOW_LARGE_DIFF=1` (name retained).
- `rejected.json`, `review.json` and `refresh-report.json` are written **before** any guard
  can throw, so the operator can read what happened.

Guards 1 (SKU-family) and 3 (per-brand non-apparel ceiling) are unchanged.

### Report

Per brand: fetched · complete? · new · updated · delisted · filtered · returned. Plus
totals, the full list of new titles, and the full list of filtered titles with reasons.
Written to `data/refresh-report.json` and printed as a console table.

## Testing

`lib/lifecycle.test.ts`, no network, no filesystem:

- complete fetch omitting a row → `delistedAt` set
- **incomplete fetch omitting a row → `delistedAt` NOT set** (the §10.1 regression test)
- 20-page cap reached → fetch reported incomplete
- a returning product clears `delistedAt` and retains a `cut` decision
- an existing decision (`keep` or `cut`) is never overwritten; an absent one defaults `keep`
- `firstSeen` set once and never rewritten; `null` backfill preserved
- per-brand guard: 40% loss throws · 5% loss passes · >0→0 throws · 2-of-3 loss passes
- publish predicate rejects `delistedAt` / `filteredAt` rows

`lib/normalize.test.ts`: `normalizeProductDetailed` returns the correct reason for each of
the three rejection paths, and `normalizeProduct` stays behaviourally identical.

Also fixes the pre-existing TS2739 in `lib/normalize.test.ts:5` (the `Brand` fixture is
missing `category`, `city`, `vibe`), which unblocks the `typecheck` script proposed in §12.

## Risks

| Risk | Mitigation |
|---|---|
| First refresh delists a large tranche of genuinely-stale rows at once | Snapshot taken first; per-brand guard blocks publish; report reviewed before `ALLOW_LARGE_DIFF` |
| A brand's feed URL dies → 100% delist | Incomplete fetches cannot delist; a non-OK status makes the fetch incomplete |
| Re-derivation changes thousands of images at once (the §10.11/§10.12 fix finally landing) | Expected and desired; report surfaces the count |
| `data/.backups/` grows | Gitignored; manual housekeeping, not automated deletion |
