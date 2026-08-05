# Enforce the CSP and give raw-products.json a durable backup
**Date:** 2026-08-05 · **Status:** done

## Goal
Close the two real gaps left after the site went live on `themodestyhouse.com`:
the CSP was shipping in Report-Only (blocking nothing), and `raw-products.json`
— the only unrecoverable file in the project — still existed on exactly one disk.

## What changed

**`next.config.ts` — CSP flipped from Report-Only to enforcing.**
The policy was held in Report-Only because the Skimlinks host set could not be
verified. That reason no longer applied: Skimlinks was not rendering at all in
production (`NEXT_PUBLIC_SKIMLINKS_ID` unset on Railway — 0 occurrences of
`skimlinks|skimresources` in the served HTML), so nothing depended on the
unverified part of the allowlist. Its hosts stay allowlisted so that setting the
key later does not silently break the affiliate script.

**`scripts/backup-raw.mjs` + `data/raw-products.json.gz` (tracked).**
`raw-products.json` stays gitignored — 9.4 MB of churn per ingest would bloat
every commit. The gzipped snapshot is tracked instead, so pushing the repo backs
it up. Guards, all of which exist because the original data loss was caused by a
partial write silently replacing a complete one:
- refuses to write a snapshot with fewer rows than the existing one (`ALLOW_SHRINK=1` to override)
- refuses to restore over a larger local file
- decompresses and row-counts the artifact *before* it replaces the previous snapshot —
  a backup that has never been read back is not a backup

**`package.json`** — `npm run backup:raw` / `npm run restore:raw`.

## Verification

CSP safety, checked against the live site before flipping (a wrong allowlist
fails silently, so this had to be evidence rather than reasoning). Every
`<script src>` and stylesheet on `/`, `/directory`, `/editorial`,
`/editorial/[slug]`, `/designers` and `/privacy` resolved to same-origin `/`,
with **0 iframes** on every page. The only cross-origin subresource anywhere is
`cdn.shopify.com`, already allowlisted in `img-src`.

Live endpoint probes confirming the earlier P0-A fix actually landed in production:

```
/api/curate            404
/api/curate/list       404
/admin/curate          404
POST /api/curate {"decision":"cut"}  -> 404
```

Headers served by production: HSTS `max-age=63072000; includeSubDomains`,
`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`.

Backup:

```
Backed up 15848 rows -> data/raw-products.json.gz (9.4 MB -> 0.80 MB, round-trip verified)
snapshot rows: 15848 | live rows: 15848 | identical: true
brands captured: 48
```

48 brand slugs are present in the snapshot — more than the 32 in `BRANDS`,
i.e. it captures the rows for cut brands that no scrape can ever return.

## Notes / follow-ups
- `/api/csp-report` was reviewed and left as-is: it already caps the body at
  8 KB, never writes to disk, never returns 500, and always 204s. Log spam is the
  only residual risk and the file documents it. Keep it through the enforcing
  soak — that is exactly when violation reports are worth having.
- **Re-verify the CSP the first time Skimlinks actually ships.** The allowlist
  for it has still never been tested against real traffic.
- The backup is only as current as the last `npm run backup:raw`. It is not
  wired into `add-brands.mjs` or `refresh.mjs`; if it should be automatic, that
  is a follow-up.
- Backup lives in the same GitHub repo as the code — one provider. Adequate for
  now, not a true off-site copy.
