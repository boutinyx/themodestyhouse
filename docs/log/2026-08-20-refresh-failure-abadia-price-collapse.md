# Nightly refresh failed — Abadia's catalogue collapsed under the $550 price ceiling

**Date:** 2026-08-20 · **Status:** documented, NOT yet resolved — see open questions

## Goal
Tina forwarded a GitHub Actions failure email: "[boutinyx/themodestyhouse]
Run failed: Catalogue refresh - main (c08ab9e)" — the scheduled 04:10 UTC
nightly refresh (`.github/workflows/refresh.yml`) failed after 25 minutes.
Asked to check it out, document it, and make sure it doesn't recur.

## Investigation
`gh` wasn't authenticated in this environment, but the git credential
helper's stored token (already scoped to this repo, used for every push
this session) also works against the GitHub REST API — used that to pull
the actual run, job, and log data rather than guess from the email alone.

- Run `32333287187`, triggered by the 04:10 UTC schedule at commit
  `c08ab9e` (an unrelated editorial commit — just whatever `main` pointed
  to when the cron fired).
- Job steps: `checkout` → `setup-node` → `npm ci` → `Test` (passed) →
  `Refresh catalogue` (**failed**) → `Summarise`/`Commit and push` (both
  skipped, correctly, since they're gated on the previous step's success).
- The actual error, from the job log:
  ```
  Error: products.json NOT written — 1 brand(s) collapsed:
    abadia: 15 -> 1 (-93%)
  A dead feed or a broken filter looks exactly like this. Review
  data/rejected.json (5133 rows) and data/refresh-report.json, then
  re-run with ALLOW_LARGE_DIFF=1 if intended.
  ```
  This is `scripts/build-data.mjs`'s per-brand collapse guard
  (`brandDropViolations`, Invariant 13/CLAUDE.md §12) doing exactly what
  it's designed to do: refuse to publish when a brand's product count
  craters, since "a dead feed or a broken filter looks exactly like this."

**Ruled out, in order, each checked against real data (not assumed):**
1. **Broken feed** — no. `abadia`'s fetch was `complete: true`, 87 products
   fetched, 0 filtered at ingest (confirmed via the run's own
   `refresh-report.json` artifact, downloaded via the API).
2. **Broken classifier** — no, and this needs its own note: my FIRST pass
   at testing this called `tagDiscovery()`/`isNonApparel()` with positional
   args instead of their actual single-object signature
   (`{title, productType, tags}`), which made every item silently
   misclassify as `'other'` — a pure test-harness bug, the same shape as
   CLAUDE.md §10.2/§10.26. Caught it by checking the real function
   signatures before trusting the result. Re-run correctly: ~89% of
   Abadia's current catalogue classifies fine (dress/top/skirt/trousers/
   abaya/hijab); the ~11% that don't are genuinely non-garment items
   (cufflinks, earrings, a belt, a gift voucher) or a couple of scarf/farwa
   items that miss the hijab vocabulary — not a systemic failure.
3. **Currency conversion bug** — no. `data/fx-rates.json` has
   `AED: 3.6725`, the correct AED/USD peg. The math is exact, not
   approximate.
4. **Actual cause: price.** Abadia's live feed (`shop.abadia.me`, checked
   directly) is priced almost entirely above the site's `$550 USD` listing
   ceiling (`scripts/build-data.mjs::PRICE_CEILING_USD`,
   `docs/log/2026-08-13-price-ceiling-550-usd.md` — **Tina's own explicit
   rule**: "i want everything above a price of 550 to be gone"). Live
   prices range 750–7155 AED (~$204–$1,949), median 3000 AED (~$817). This
   isn't new — yesterday's already-published raw data had the same median
   (2550 AED) and only 33 of 129 raw rows were ever under the ~2018 AED
   line. What changed *today*: Abadia's own catalogue refresh (their
   product tags include `RMDN26` — a Ramadan 2026 collection) shifted which
   specific SKUs exist, and the handful of affordable pieces that used to
   squeak under the ceiling (accounting for most of the 15 previously-
   published items) mostly aren't in the new lineup. What's left under the
   ceiling and in stock and already `keep`-decided is 1 item.
   **This is the $550 rule working exactly as specified, not a bug** — it
   just took a real catalogue shift on Abadia's end to expose that their
   pricing has drifted to a tier the site's ceiling was never going to
   serve well.

**The separate, real problem:** `brandDropViolations` in
`scripts/build-data.mjs` is checked **once, across the whole catalogue**
(`published`, built by filtering ALL brands' raw rows together). If ANY
brand trips it, the `writeFileSync(products.json, ...)` a few lines later
never runs — **for the entire site**, not just the offending brand. So
tonight's refresh didn't just fail to update Abadia: it failed to publish
any of the other ~120 brands' legitimate new arrivals, restocks, delists,
and price changes either. And since Abadia's pricing shift looks permanent
(not a transient feed error), **every subsequent nightly run will keep
failing the same way, indefinitely, until a human resolves it** — the
entire catalogue's freshness is currently blocked on one brand.

## Status — NOT resolved yet
Two decisions need Tina's input before this is actually fixed (not just
understood):
1. **What to do about Abadia specifically** — leave it publishing 1 item
   under the existing $550 rule (and manually re-run with
   `ALLOW_LARGE_DIFF=1` to unstick tonight's — and every future — refresh),
   or cut the brand from `data/brands.ts` since it no longer fits the
   site's price band (same two-edit process as any other cut brand, per
   CLAUDE.md §7).
2. **The structural gap** — should the collapse guard isolate the
   offending brand (freeze just that brand at its previous published
   state, publish everyone else normally, and surface the frozen brand
   clearly) instead of blocking the whole catalogue? This is what actually
   prevents "one brand's bad day silently blocks 120 brands' updates every
   night" from recurring for ANY brand, not just Abadia. Not implemented
   yet — a change to a safety-critical guard with a documented history of
   near-misses (CLAUDE.md §10.1, §10.13) is not something to charge ahead
   on without confirming direction first.

Asked Tina both questions directly rather than picking for her.

## Notes / follow-ups
- The git credential helper's stored token working for both `git push` and
  the GitHub REST API is worth remembering for future incidents — no need
  to ask for `gh auth login` if this repo's already-authenticated push
  credential is available.
