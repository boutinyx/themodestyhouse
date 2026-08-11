# Why ChatGPT didn't name The Modesty House for "find more modest brands"
**Date:** 2026-08-11 · **Status:** done (investigation only, no fixes applied)

## Goal
Tina asked ChatGPT to find more modest fashion brands and it never named
themodestyhouse.com. Investigate the real cause using the `seo-geo` skill's
criteria rather than guessing.

## What was checked
- `app/robots.ts` and the live `https://themodestyhouse.com/robots.txt` (fetched directly) —
  identical, AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, PerplexityBot, etc.)
  explicitly allowed.
- `public/llms.txt` — present, well-formed, lists every section. Per Google's AI optimization
  guide this affects non-Google AI crawlers only, not a Google/AIO lever.
- `lib/schema.ts` — `organizationSchema()` has no `sameAs`. No links to any external profile
  (Instagram, Pinterest, etc.) anywhere in the schema graph.
- `app/faq/page.tsx` — 10 Q&As, all about how the site itself works ("Is this a shop?", "How
  are brands chosen?"). None phrased as the query Tina actually typed ("find modest brands" /
  "where can I find curated modest brands").
- `docs/log/2026-08-11-seo-geo-aeo-visible-content-and-indexnow.md` — IndexNow script
  (`npm run seo:indexnow`) exists but its own log says submission was **never actually run**,
  pending deploy of the key-verification file.
- `docs/log/2026-08-11-seo-geo-aeo-full-repo-coverage.md` — confirms Search Console is
  verified (a `google-site-verification` DNS record resolves).
- Live check: `WebSearch("site:themodestyhouse.com")` — **zero indexed pages returned.**
- `WebSearch("\"The Modesty House\" modest fashion directory")` — returns unrelated
  similarly-named brands (modestyhouse.ca, House of Modesty LLC) instead, confirming a
  name-collision risk once the site is indexed.

## Root cause
The technical GEO setup (robots.txt, llms.txt, schema, differentiated lane content) is
already correct — that work landed today. The actual blocker is upstream of all of it:
**Google has not indexed the site yet** (0 results for `site:themodestyhouse.com`), and
IndexNow — the one lever that pings Bing/Yandex/Naver directly — was built but never
triggered. An AI answer engine can only cite what a search index has already crawled; there
is currently nothing to retrieve. Compounding: brand-mention signals (Wikipedia, Reddit,
YouTube, LinkedIn), which the skill's own data says correlate far more strongly with AI
citation than backlinks, are at zero — no `sameAs` entries, no social presence found.

## Not done (needs Tina's input, not invented — CLAUDE.md §10.18)
- `sameAs` needs real social profile URLs; none exist to add yet.
- Running `npm run seo:indexnow` pings an external API — held for explicit go-ahead.
- A "find modest brands" style FAQ answer needs her voice, not invented copy.

## Follow-ups (prioritized)
1. Run `npm run seo:indexnow` now that the key file is presumably deployed.
2. Confirm in Search Console (manual, has login) whether any pages have been crawled/indexed
   yet — `site:` returning 0 is necessary but not sufficient evidence either way.
3. Add one FAQ entry that self-contained-answers "what are good modest fashion brands" /
   "where can I find curated modest brands" in ≤60 words, naming the site directly.
4. Once real social accounts exist, add `sameAs` to `organizationSchema()`.
5. Time: recency/authority accrue after indexing, not before — expect this to take real
   weeks, not a single deploy.
