# Cut BAQA "Shoulder Detailed Printed Blouse"
**Date:** 2026-10-13 · **Status:** done

## Goal
Tina sent a screenshot of the card and asked for it to be removed and pushed live.
The product is `baqa:9339395113211`, a bare-shoulder poncho blouse.

## What changed
- **`data/exclusions.json`:** the id was added to `ids`. This is a permanent removal (Invariant 3).
- **Republish:** `npm run build:data` took the catalogue from 20,743 to 20,742 rows. Compared with `origin/main`, exactly one id was removed, none were added, and 0 other rows changed content. The row order moved, as `interleaveByBrand` always does.
- **Commit:** `44758b6` on `fix/cut-baqa-shoulder-blouse`, branched from `origin/main`.
- **Staging:** the branch was merged into staging, and `products.json` was regenerated on the staging base rather than hand-merged.
  - Staging carried another session's unshipped Yasmin Jay activewear pins, so it could not be fast-forwarded to main as a whole.
  - Main was fast-forwarded to `44758b6` alone.

## Verification
The check script `/tmp/shot/chk.py` matches the quoted title in the payload (§10.49). It has a control row that must stay present: "Blouse with Scarf Detail on the Collar", also BAQA, also on /modest-tops.

| | blouse on /modest-tops | control | /product/baqa/9339395113211 |
|---|---|---|---|
| production, before | present | present | 200 |
| staging, after deploy | **absent** | present | **404** |
| production, after deploy + purge (canonical URL, MISS then HIT) | **absent** | present | **404** |

## Notes / follow-ups
- Cloudflare was purged only after the cache-busted origin request already showed the change (§10.47).
