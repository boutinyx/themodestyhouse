# Cut Ipekstil (Turkey-only shipping)
**Date:** 2026-08-15 · **Status:** done

## Goal
Tina asked to remove Ipekstil — they only ship within Türkiye, not useful for this
catalogue's audience.

## What changed
Two-edit cut, per Invariant/§7 (permanent removals go in `exclusions.json`, never
`decisions.json`, and the brand record must come out of `brands.ts` too so nothing
re-fetches the feed):
- `data/exclusions.json` — added `"ipekstil"` to `brands`.
- `data/brands.ts` — removed the `ipekstil` record entirely.
- Ran `npm run build:data`. It refused once as designed:
  ```
  Error: products.json NOT written — 1 brand(s) collapsed:
    ipekstil: 301 -> 0 (-100%)
  ```
  Re-ran with `ALLOW_LARGE_DIFF=1` since this collapse was intentional, not a dead feed.

## Verification
```
$ python3 check data/products.json
ipekstil products remaining: 0
total products: 21387
```
Brand fully cut, publish succeeded on the override.

## Notes / follow-ups
- Did not independently verify the Turkey-only shipping claim beyond a quick homepage
  check (no shipping info surfaced there, likely JS-rendered) — this was Tina's direct
  editorial call, not something requiring independent verification the way a
  classification bug would.
- Not committed or pushed — local working tree only.
- If `ipekstil` is ever re-added to `brands.ts` by mistake, the build will silently drop
  100% of its rows per the exclusions list (documented existing behavior, not new).
