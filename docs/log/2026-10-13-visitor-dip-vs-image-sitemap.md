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

## Follow-up: why ChatGPT sends fewer people (same evening)
- ChatGPT entry pages, Sep 1-21 vs Sep 22-Oct 13: `/` 64 → 26, `/designers` 18 → **0**, `/modest-dresses` 15 → 5,
  where-to-buy-hijabs 12 → 3, `/modest-sets` 12 → 6. Referrers are all ChatGPT/chatgpt.com (229), Perplexity 1.
- Crawl access is fine: `/`, `/designers` and `/modest-dresses` return 200 with full HTML to the OAI-SearchBot,
  ChatGPT-User, GPTBot and bingbot user agents; robots.txt allows all of them; Cloudflare bot_management has every
  AI/crawler protection disabled. Firewall-event analytics isn't available on this plan, so blocks by real bot IPs
  remain unverified.
- Bing coverage could NOT be measured: Bing search inside the automation browser returns unrelated results even for
  a control (`site:merrachi.com abaya` → Notepad++ pages), and DuckDuckGo blocks scripted queries. Bing Webmaster
  Tools needs Tina signed in. That is the next step: index coverage, sitemap submission and URL inspection there.

## Bing Webmaster Tools (Tina signed in, same evening)
- Site was already registered. Sitemap `sitemap.xml`: Success, 165 URLs discovered, last crawl 2026-10-11.
- Site Explorer: 114 indexed, 0 errors, 1 warning, 2 excluded. **Backlinks: 1.** Search, last 6 months:
  556 impressions, 16 clicks.
- AI Performance (Copilot + partners), Aug 25–Oct 11: 164 citations, **rising** (October days run 1-28, versus 0-7 in
  August). Cited pages: `/` 80, `/designers` 40, `/designers/merrachi` 28, `/modest-dresses` 10. Grounding queries:
  "modest clothing brands" (12.7% citation share), "modest clothing brands for women" (17.7%).
- Conclusion: Bing indexes and cites us more than before, so the ChatGPT drop isn't a Bing coverage problem.
  ChatGPT changed what it cites. The clearest gap is authority: 1 backlink (Bing's top recommendation too).
- Bing's "meta descriptions too short" recommendation: measured all 164 sitemap URLs; only 5 are under 100 characters
  (terms, privacy, editorial index, contact, about). Low value, left alone.
