# ADR-0001 — Flat JSON files as the catalogue store

**Date:** 2026-08-05 · **Status:** accepted (with conditions)

## Context

The Modesty House publishes ~5,000 products from ~34 Shopify storefronts. The question was
raised directly: should this use Postgres instead of flat JSON files, given a public launch
is imminent?

Facts that bear on it:

- The catalogue is **read-only at runtime**. There is no cart, no checkout, no accounts —
  every commercial action is an outbound link to the brand.
- All catalogue pages are **prerendered at build time**. Data is read by `fs` in the Vercel
  build container, never per request.
- Current scale: ~5,000 published rows, 2.8 MB on disk. 32 routes generate in ~370 ms.
- Growth is an **editorial** process (a human curating brands), not a user-generated one.
- Vercel's runtime filesystem is **read-only**, so no runtime write can persist to a file
  regardless of format.

Measured cost profile: the disk file is cheap; the expensive thing is that server pages pass
full product arrays into client components, serializing ~471 bytes per record into the RSC
payload. `/directory` ships ~1.4 MB to render 24 cards.

## Decision

**Keep flat JSON as the catalogue store.** Treat it as a build-time artifact, not a
database.

- `data/brands.ts`, `data/exclusions.json` — hand-edited **source**, in git.
- `data/raw-products.json` — ingest cache. Must be **backed up off-repo** (it is currently
  gitignored and single-copy; this has already caused permanent data loss).
- `data/products.json` — generated build artifact, in git so deploys are reproducible.

**Adopt a database when the first per-request write is needed** — not at a row count. The
concrete triggers, any one of which is sufficient:

- outbound click / commission tracking (expected in week one of launch)
- cross-device favourites (today `localStorage` only)
- brand self-submission forms
- user accounts
- price freshness better than the weekly rebuild

When that happens: Postgres via Supabase or Neon (zero-ops, generous free tier), or Turso.
The dynamic data moves; **the catalogue stays static.**

## Consequences

**Positive**
- Zero infrastructure to operate, secure, patch or pay for at launch.
- A CDN-served static site absorbs traffic spikes for free — the ideal shape for an
  SEO-driven affiliate directory, and better under load than a DB-backed catalogue.
- Data is diffable and reviewable in git; a bad publish is a revert.
- No connection pooling, migrations, or cold-start latency.

**Negative / accepted risks**
- **No transactions.** A partially-written file corrupts the catalogue. Mitigated by
  upsert-only ingest and per-brand checkpointing (see `HANDBOOK.md` §10.1).
- **No concurrency control.** Two scrapes running at once clash. Mitigated by convention
  only: run one at a time.
- **Whole-file rewrites** produce large diffs and make `decisions.json` awkward in git.
- **No query engine** — every read is a full parse plus `.filter()`. `getProducts()` is
  currently uncached and re-parses 2.8 MB per call.
- **Runtime writes are impossible**, which is why the existing curate API cannot work in
  production (see `launch-readiness.md` P0-A).

**Conditions attached to this decision**
1. `raw-products.json` gets a durable off-repo backup. Non-negotiable.
2. The RSC payload problem (P1-A) is fixed — that, not the file format, is the real ceiling.
3. `getProducts()` gets memoized once it shows up in build timings.
4. `decisions.json`'s role is resolved (see Alternatives) — it is currently a file
   pretending to be a database.

## Alternatives considered

**Postgres now (Supabase/Neon).** Rejected for the catalogue: it would add ops burden,
cost and cold-start latency while solving none of the current problems — the bottleneck is
payload size, which a database does not change. It remains the right answer for dynamic
data, and is expected to arrive with click tracking.

**SQLite / Turso.** A better fit than Postgres for a read-heavy embedded catalogue, and
worth revisiting at ~20k rows. Rejected for now as unnecessary complexity.

**Drop `decisions.json` entirely** and make `build-data.mjs` default-allow-minus-exclusions.
Genuinely attractive: `exclusions.json` + `inStock` is what actually shapes the catalogue
today, while `decisions.json` holds thousands of stale keys, all `keep`, many pointing at
permanently-blocked brands. **Deferred to its own ADR** — it changes the curation model and
deserves a decision of its own rather than being smuggled in here.
