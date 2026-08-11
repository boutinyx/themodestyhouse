# Visible-copy expansion, IndexNow, and corrections from claude-seo's own docs
**Date:** 2026-08-11 · **Status:** done

## Goal
Tina: "do whatever the claude seo thingie said to do to make it better." This session read
the actual sub-skill reference docs installed at `~/.claude/skills/seo-*/SKILL.md` (technical,
content, geo, schema, programmatic, sitemap) rather than working from the earlier WebFetch
summary, and implemented what they call for that wasn't already done.

## Two corrections to what was reported earlier
Reading the real skill docs surfaced two things the earlier sessions got slightly wrong by
being too optimistic about:

1. **`FAQPage` schema (added 2026-08-11 on `/faq`) produces no Google rich result as of
   2026-05-07** — Google retired FAQ rich results for all sites that date. `seo-schema`'s own
   guidance: "flag existing FAQPage at Info (not Critical) rather than removal." Kept the
   schema (harmless, still a clean machine-readable Q&A format for non-Google AI parsers) but
   its value is GEO/LLM-parsing only now, not a SERP feature. Corrected here rather than left
   overstated.
2. **`llms.txt` (added 2026-08-11) does not affect Google Search** — `seo-geo`'s reference:
   Google's AI optimization guide states explicitly that not having `llms.txt` "won't harm
   (nor help) your visibility or rankings in Google Search, as Google Search ignores them,"
   and John Mueller called the file "a dead end." Kept (harmless, may help minor non-Google AI
   crawlers, unconfirmed), but it is not the GEO lever it's sometimes marketed as.

## What changed

### Lane pages: real, differentiated content (the highest-value finding)
`seo-programmatic`'s own thin-content quality gates flag exactly this site's shape: 12
near-identical category-page templates, each with only ~15-20 words of unique text (the
garment name and a one-line description). Its stated risk pattern — "location pages with only
city name swapped in identical text" — is structurally the same problem as "category pages
with only the garment name swapped."

- **`lib/laneAnswers.ts`** (new) — a 100-160 word "What is X" answer block per lane (all 12),
  each covering genuinely different facts (fabric, construction, care, occasions) rather than
  one template with words swapped in. Grounded in generic, verifiable fashion knowledge — not
  a claim about this site or its brands. Word counts target `seo-geo`'s cited 134-167-word
  optimal-citability window (most land 126-152; not forced further to avoid padding).
- Each block carries 2 contextual "Also browse" links to related lanes — real page-specific
  internal linking on top of the footer's sitewide nav, per both `seo-content` and
  `seo-programmatic`'s "3-5 internal links per 1000 words" guidance.
- **`app/[lane]/page.tsx`** — renders the block BELOW the product grid, not above it. AEO
  guidance favours front-loading citable content, but a shopper landing on a category page
  wants the products first; this is the standard e-commerce pattern (short intro up top,
  longer informational copy after the grid), not a case of burying it out of caution. Still
  server-rendered in the initial HTML, not client-injected — verified below.
- **`lib/laneAnswers.test.ts`** (new) — every lane has an entry, every body is 100-180 words,
  no two lanes share a body or heading (the specific "mad-libs" pattern the skill warns
  against), every `related` slug points at a real, different lane.
- The original visible intro (`lane.intro`, one line under the h1) and the h1 itself are
  UNCHANGED — this adds a new block, it doesn't rewrite what was already there.

### IndexNow (Bing/Yandex/Naver/Seznam instant-indexing — not Google, which doesn't participate)
Named directly in `seo-technical`'s checklist (category 9) as not yet implemented.

- **`public/cee9f84f266c58db70309c208ab4496a.txt`** (new) — the IndexNow key-verification
  file. Not a secret: the protocol requires this exact file to be served publicly so the API
  can confirm domain ownership; hardcoding the same key in the script below is not a
  disclosure.
- **`scripts/indexnow-notify.mjs`** (new) — self-contained Node script (no TS imports, no
  dependency on the claude-seo Python tool being installed) that POSTs the site's ~23 real
  URLs (static paths, all 12 lanes, both editorial posts) to `api.indexnow.org`.
  **Deliberately NOT wired into `postbuild:data`/`postrefresh`** — those run unattended in CI
  on a schedule and CLAUDE.md already documents them as fragile; this is a manually-triggered
  notification (`npm run seo:indexnow`), not a new pipeline dependency. Product URLs aren't
  included because there are none — `ProductCard` links outbound, not to an internal page.

### Verified, not changed (already correct)
- **Security headers** — checked all 5 `seo-technical` names (CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy) against production directly: all present, HSTS
  includes `includeSubDomains`. Nothing to fix.
- **Back-button hijacking** (added to Google's spam policy 2026-04-13, enforcement live since
  2026-06-15) — grepped the whole codebase for `pushState`/`replaceState`: zero occurrences.
  No risk.
- **AI-crawler robots.txt rules** — `seo-technical`'s explicit bottom-line recommendation is
  "Allow GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot for AI search visibility," which is
  already what `app/robots.ts` does (added earlier today) — no change needed.

## Verification

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npx vitest run
(clean — 480/480 tests, 4 new in lib/laneAnswers.test.ts)
$ npm run build
(32 routes, unchanged)
$ node --check scripts/indexnow-notify.mjs
syntax OK
```

Production build (`next start -p 4177`), curled directly:

```
/modest-abayas    "What is an abaya?" present (server-rendered)
                   "Also browse" links to /modest-dresses and /modest-hijabs present
/modest-swimwear  "What is a burkini?" present — confirms per-lane content actually differs,
                   not a single templated string reused with the garment name swapped
/cee9f84f266c58db70309c208ab4496a.txt  -> HTTP 200, body is the key
```

IndexNow submission itself was NOT run yet — the key file has to be live on
`themodestyhouse.com` first (the API verifies `keyLocation` is reachable), which needs this
commit deployed. Documented as a follow-up: run `npm run seo:indexnow` once deployed.

## Notes / follow-ups
- IndexNow submission still needs to be triggered once this deploys — `npm run seo:indexnow`.
- Everything else from the `seo-technical`/`seo-content`/`seo-geo`/`seo-schema`/
  `seo-programmatic`/`seo-sitemap` reference docs that would need paid API access
  (PageSpeed/CrUX field data, DataForSEO, GSC inspection, keyword volume) remains unrun —
  same limitation as the first pass, not new.
