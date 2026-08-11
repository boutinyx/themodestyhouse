# Garment classification — confidence, cross-checking, and a permanent fix path

**Date:** 2026-08-12 · **Status:** approved, proceeding to implementation plan (Tina's call)

## Goal

Fix the class of bug behind "trousers in dresses" / a hijab neck-cover showing up as a top
(reported via Reddit screenshots, 2026-08-11), and fix why it keeps recurring instead of
getting fixed once. Two things, not one:

1. **Clean up what's wrong now** across the ~23k already-published products.
2. **Make future `lib/tag.ts` fixes actually permanent** — today a fix only reaches products
   that get re-scraped (`npm run refresh`); everything else keeps its frozen, wrong value
   forever (CLAUDE.md §8/§10.12). The classifier itself has been patched five separate times
   (§10.5, §10.10, §10.11/§10.12, §10.16, §10.31) and each patch only ever fixed the past.

## Context / what's already there

`normalizeProductDetailed` (`lib/normalize.ts`) runs `tagDiscovery` (`lib/tag.ts`) once, at
ingest time, and only `garment` (the final answer) is kept — the signals that produced it
(`product_type`, Shopify's own `tags`) are discarded. `raw-products.json` never had them, so
`build-data.mjs` cannot re-derive a classification without a full re-fetch.

**`build-data.mjs` already has a dead hook for exactly this problem:**
```js
else if (p.raw?.classifiedFrom === 'meta') review.push({ id: p.id, title: p.title, url: p.url, why: 'meta-only' });
```
and `verdict()` reads `...(p.raw || {})` for non-apparel evidence. Verified against the live
data: **0 of 37,963 raw rows have ever had a `.raw` field** — nothing writes it. This design
finishes wiring that hook rather than inventing a new mechanism.

## Non-goals

- No sleeve-length / neckline / other sub-attributes. Scope is garment-enum correctness only.
- No LLM in the classification path (Tina's call — see the brainstorm transcript, rejected in
  favor of the review-queue option).
- No change to the separate non-apparel veto (`lib/nonApparel.ts`) or its guards.
- Not persisting `body_html` — the last-resort description-lead pass (§ pass 4 in `tag.ts`)
  stays ingest-time-only. Persisting descriptions catalogue-wide was tried and reverted once
  already (~6.5MB, `docs/log/2026-08-05-product-pages-and-descriptions.md`); re-adding that
  cost for a rarely-hit fallback (321 of 4,694 measured) isn't worth repeating.

## 1. Immediate regex hardening (`lib/tag.ts`)

Independent of everything else below and safe to ship first. Several `GARMENT_RULES`
alternatives match as bare substrings with no word boundary — the exact bug class §10.10
fixed for `set`/`pant`, missed for these:

- `top` rule: `/top|blouse|shirt|tunic|sweater|cardigan|bolero|blazer|vest|coat|jacket/i` —
  `vest` matches inside Spanish "**Vest**ido" (dress), `coat` matches inside "Petti**coat**"
  (an underskirt/slip, not a top), `top` itself matches inside a brand's own `Tops` tag
  regardless of what the title says.
- `dress` rule: `/dress|gown/i` — `dress` matches inside "Head**dress**" (a headpiece).
- `skirt` rule: unanchored `skirt` — lower risk (no known false positive in-corpus) but
  brought in line with the others for consistency.

Fix: wrap each in the existing `word()` helper (already used for `trousers`/`set`,
Unicode-aware boundary — plain `\b` is insufficient off-ASCII per the comment already in the
file). Add regression fixtures to `lib/tag.test.ts` for the specific false positives above,
following the existing pattern (real corpus titles, not invented ones).

## 2. Data model — persist the signals, not just the answer

`lib/normalize.ts`: `normalizeProductDetailed` adds two fields to the returned row,
**outside** the `Product` interface (never reaches `products.json` / the RSC payload —
Invariant 15 stays intact, this is raw-only):

```ts
raw: {
  productType: string;   // sp.product_type, as fetched
  tags: string[];        // sp.tags, normalized to an array (already done for the excl check)
  classifiedFrom: 'title' | 'meta' | 'foreign' | 'description';
}
```

`classifiedFrom` comes from `tagDiscovery`, which currently returns only `{ garment,
occasion, season, activity }` with no record of which of its 4 passes matched. It gains a
`source` field reporting that.

`raw-products.json` size: current 37,963 rows × (~product_type string + tags array) is a
bounded, one-time increase to an already-committed 18MB file — no different in kind from
committing the file at all (§10.15/P0-B). Not shipped to the browser.

## 3. Second, independent signal — classify from `product_type` alone

`tagDiscovery` (or a small new export, `classifyFromType`) runs the **title-tier**
`GARMENT_RULES` against `product_type` alone (not the combined `hay`, and not falling through
to foreign/description passes — this is meant to be a second *opinion*, not a second chance
at the same fuzzy fallback). Returns a garment or `'other'`.

## 4. Publish-time re-derivation (`build-data.mjs`)

For each raw row, **when `raw.productType` is present** (i.e. the row was scraped after this
ships):

1. Re-run `tagDiscovery(row.title, row.raw.productType, row.raw.tags)` fresh, at publish
   time — mirrors the title-translation-at-publish fix (§4/§8, 2026-08-10) applied to
   classification instead of translation.
2. Compute `typeGarment = classifyFromType(row.raw.productType)`.
3. Decide:
   - `source === 'title'` **and** (`typeGarment === titleGarment` or `typeGarment ===
     'other'`, i.e. no contradicting opinion) → **confident**. Publish with the fresh
     `garment`.
   - `source === 'title'` **and** `typeGarment` disagrees (both non-`'other'`, different
     values) → **conflict**. Held back (see §6), both guesses recorded.
   - `source` is `'meta'` / `'foreign'` / `'description'` → **weak signal**. Held back.
   - `garment === 'other'` (nothing matched) → existing behavior, unchanged (held back,
     `why: 'unclassified'`).
4. **When `raw.productType` is absent** (row pre-dates this change, not yet re-scraped): no
   re-derivation is possible — fall back to the row's frozen `garment` exactly as today.
   Nothing regresses on rows that haven't been touched; behavior only improves as brands get
   refreshed. This is the reason a one-time `npm run refresh` (§8 below) is part of the
   rollout, not optional.
5. **Manual overrides always win**, checked before any of the above (§5).

This directly answers Tina's "hold it back until reviewed" decision: a held-back row is
excluded from `published` the same way `garment === 'other'` already is — not shown with a
flag, not shown at all, until resolved.

## 5. Manual overrides (`data/garment-overrides.json`)

New file, same shape and spirit as `decisions.json`: `{ [productId]: Garment }`.

- Checked first in the publish-time decision above — an id present here always wins, no
  re-derivation, no review-queue entry, ever, regardless of what the regexes say next.
- Written only by a human via the review UI (§6) — never by any automated ingest/publish
  path. This is a direct, deliberate application of §10.13 (`decisions.json` got silently
  overwritten by an automated `keep` because the ingest script couldn't tell "no opinion"
  from "confirmed"): a garment override is a **decision**, and decisions and automated
  classification live in different files for exactly that reason.
- `decisions.json`-style drift over time (ids for products later delisted) is an accepted,
  pre-existing cost in this codebase (§8, "decisions.json has drifted") — not solved here,
  not worse here.

## 6. Review surfacing

`review.json` entries for garment cases gain both guesses:
```json
{ "id": "...", "title": "...", "url": "...", "why": "signal-conflict",
  "titleGuess": "top", "typeGuess": "trousers" }
```
(`why: 'weak-signal'` for the meta/foreign/description case, with just `titleGuess` — there
is no title match to conflict with.)

A new dev-only page, `app/admin/review/` (`page.dev.tsx` + client component), same 4-layer
guard pattern as `/admin/curate` (`route.dev.ts`, `devOnlyResponse()`, sentinel check in
`lib/rawData.ts`, excluded from `pageExtensions` outside the dev build phase — CLAUDE.md
§11 P0-A). Lists `review.json` grouped by `why`; for garment-related entries, shows the
image, title, both guesses, and a dropdown (the 9 `Garment` values) that POSTs to a new
`app/api/garment-review/route.dev.ts` → `saveGarmentOverride(id, garment)` in `lib/rawData.ts`
→ writes `garment-overrides.json`, guarded identically to `saveDecision`.

No new review cadence is being designed here beyond "Tina opens this page when she feels
like it" (her stated preference) — no notification, no SLA.

## 7. Testing

- `lib/tag.test.ts`: regression fixtures for the 2026-08-12 false positives (§1), plus a
  fixture asserting `classifiedFrom` for each of the 4 passes.
- `lib/tag.test.ts` or new: `classifyFromType` against representative `product_type` strings.
- `lib/normalize.test.ts`: `raw.productType`/`raw.tags`/`raw.classifiedFrom` present on the
  returned row.
- `scripts/build-data.mjs` has no existing test file (exclusion logic is duplicated into
  `lib/exclude.test.ts` instead, per §8's documented landmine) — add the conflict/weak-signal
  decision logic as a small pure function in `lib/` (e.g. `lib/garmentReview.ts`) specifically
  so it's unit-testable, rather than inline in the script. Tests: title-confident publishes;
  conflict holds back with both guesses recorded; weak-signal holds back; override always
  wins regardless of what the regexes say; row without `raw.productType` falls back to frozen
  `garment` unchanged.
- `lib/lifecycle.test.ts`-style test for override-file handling: an id already in
  `garment-overrides.json` is never rewritten by the automated path (mirrors the existing
  `nextDecisions` "existing decision survives" test — same shape, same lesson, §10.13).

## 8. Rollout

1. Ship §1 (regex hardening) + §2–5 (data model, re-derivation, overrides, review UI). Nothing
   changes for existing rows yet (no `raw.productType` on them).
2. Run `npm run refresh` once: backfills `raw.productType`/`tags` on every row and applies the
   hardened rules catalogue-wide in one pass. Expect Guard 2 (per-brand collapse guard,
   `lib/lifecycle.ts`) to trip, since held-back conflict/weak-signal rows shrink some brands'
   published counts — expected and already the documented escape hatch: review
   `data/rejected.json`/`review.json`, re-run with `ALLOW_LARGE_DIFF=1` once confirmed
   intentional (§8).
3. Ongoing: Tina works the review queue via `/admin/review` at her own pace. Every subsequent
   `lib/tag.ts` fix takes effect for the whole catalogue on the next `npm run build:data` — no
   re-scrape required — which is the actual point of this design.

## Open items for the implementation plan

- Exact `Garment` dropdown UX in the review page (reuse `SORT_OPTIONS`-style label list —
  none exists yet for `Garment`; will need one, e.g. `GARMENT_LABELS` in `lib/tag.ts`).
- Whether `classifyFromType` shares the literal `GARMENT_RULES` array or needs its own
  (product_type strings are shorter/cleaner than titles — likely fine to share; confirm with
  a corpus check during implementation, not speculated here).
