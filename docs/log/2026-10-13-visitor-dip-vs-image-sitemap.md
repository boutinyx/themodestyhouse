# Visitor dip check: is the image sitemap to blame?
**Date:** 2026-10-13 · **Status:** done (diagnosis only, no change)

## Goal
Tina noticed fewer visitors "since the image sitemap" and asked for a check in Search Console and Pulse.

## Findings
- Image-sitemap change (640a504) reached main 2026-10-13 15:26 +0200. The dip begins **2026-10-11**, two days earlier, so it can't be the cause. A sitemap only changes what Google crawls, not who visits within hours.
- Pulse visitors/day: Oct 6-10 = 16, 21, 26, 18, 21 · Oct 11 = 7 · Oct 12 = 16 · Oct 13 = 12 (partial, checked ~20:00).
- Channels, Oct 11-12 vs Oct 4-5: Organic Search 12 vs 15 (about the same), Direct 10 vs 13, AI 1 vs 9, Organic Social 0 vs 3. The drop is in **AI + social + direct**, not Google.
- GSC web, daily clicks/impressions: Oct 8-12 = 9/368, 4/304, 5/414, 3/375, 4/250. Normal range (Sept: 2-9 clicks, 300-830 impr.). Avg position ~9, steady.
- GSC image search: impressions fell 84 to 16/day across Oct 1-12, with **0 clicks ever**, so it costs no visitors. The older `sitemap-images.xml` (submitted 2026-09-21, last read 2026-10-07) shows 0 errors.
- Tracking checked: the Pulse script tags are still in the production HTML; js.ciphera.net/script.js returns 200; CSP allows both hosts. No analytics code changed on Oct 10-11.
- Self-hosted Plausible not cross-checked: there's no API key in .env, only an admin password, which I won't type in.

## Notes
Pinterest Standard-access upgrade: dropped by Tina 2026-10-13 ("we dont need it"). Demo app at ~/pinterest-demo not used; the localhost redirect URI added to the app is harmless.
