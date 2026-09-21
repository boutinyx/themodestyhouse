# Weekly Search Console report (launchd)
**Date:** 2026-09-21 · **Status:** done

## Goal
Tina should not have to check Search Console by hand. Track whether the image sitemap
(`2026-09-21-image-sitemap-designer-pages.md`) moves image visibility, and surface SEO movement generally.

## What changed
- `scripts/gsc-report.mjs`: read-only. 28-day window ending 3 days ago (Search Console lags). Reports image and web
  impressions/clicks, designer pages with any image impression (baseline 27 of 91), queries at position 8-20, and
  page position moves of 3+ vs the previous run. Writes `.audit/gsc/report-<date>.md` + `latest.json` (gitignored)
  and raises a macOS notification. Any failure exits 1 and notifies (no silent green, section 10.28).
- `scripts/gsc-report.plist`, installed as `~/Library/LaunchAgents/com.modestyhouse.gsc-report.plist`: Mondays 09:00.
  launchd runs a missed job when the Mac wakes, if the Mac was asleep at 09:00.

## Verification
- Manual run produced a report (image 3,154 impr / 1 click; designer pages in Images 27; web 14,243 impr / 98 clicks).
- `launchctl kickstart` ran it under launchd: runs = 1, last exit code = 0, second report written.
- Failure path: run with a PATH lacking gcloud printed `GSC REPORT FAILED: no gcloud token`, exit 1.
  (A first attempt with node also off PATH proved nothing — it never reached the script.)

## Notes / follow-ups
- Runs only on Tina's Mac while it is on and `gcloud auth application-default login` is valid. The token can expire
  and then the run fails loudly. A cloud/CI run is not possible: service-account keys are blocked on this project.
- The first comparison exists after the second run (next Monday). Judge the image sitemap after ~4 weeks.
