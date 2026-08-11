# Full claude-seo coverage pass — real findings from the unread skills
**Date:** 2026-08-11 · **Status:** done

## Goal
Tina asked directly: "so you used th repo fully." Honest answer at the time was no — earlier
sessions used 6 of 21 core sub-skills (technical, content, geo, schema, programmatic,
sitemap) plus a handful of scripts. This entry covers reading the remaining relevant ones and
running what was runnable, to close that gap for real rather than claim completeness without
checking.

## What was read and what came of it

- **`seo-ecommerce`** — Product schema requirements (`name`/`image`/`offers`, `Offer` not
  `AggregateOffer`). Confirms the existing decision to withhold Product JSON-LD
  (`docs/launch-readiness.md`'s price-freshness concern) was the right call — nothing new to
  implement, the skill's own requirements are exactly the fields that would carry stale-price
  risk.
- **`seo-images`** — checked the hero/LCP image against its checklist directly: already has
  `fetchpriority="high"` (renders as `fetchPriority="high"` in the JSX source — HTML attribute
  names are case-insensitive, so this is not a bug, browsers parse it correctly), `decoding`,
  `srcset`/`sizes`, WebP variants. Already done in an earlier session (2026-08-07 mobile
  overhaul), confirmed still correct, no changes needed.
- **`seo-backlinks`** — ran the always-available Common Crawl check for real, not simulated:

  ```
  $ claude-seo run commoncrawl_graph.py themodestyhouse.com --json
  "in_crawl": false, "in_rankings": false, "pagerank": null
  ```

  The domain isn't in Common Crawl's index at all yet — confirms, with real data rather than
  assumption, that backlinks/brand-mention building (the off-site work flagged in the previous
  report) is a real, currently-empty gap, not a hedge.
- **`seo-unlighthouse`** — this one genuinely wasn't installed (the base `install.sh` copies
  generic extension files but each extension has its own dedicated installer;
  `extensions/unlighthouse/install.sh` was never run). Installed it now (pre-warms
  `npx unlighthouse-ci`, no API key needed) and ran a real 24-route mobile Lighthouse audit
  against production — the actual Core Web Vitals data the earlier report said was blocked by
  a missing Google API key. It wasn't blocked; the free local alternative just hadn't been set
  up. Results below.
- **`seo-drift`** — captured baselines for `/`, `/modest-abayas`, `/faq`, `/directory` (stored
  locally at `~/.cache/claude-seo/drift/baselines.db`) so a future session can run
  `drift_compare.py` and get an actual diff instead of re-auditing from scratch.
- **`seo-sxo`**, **`seo-cluster`**, **`seo-competitor-pages`**, **`seo-content-brief`**,
  **`seo-plan`** — read the docs, judged not worth running today: `seo-sxo`/`seo-cluster` need
  live SERP scraping via repeated WebSearch calls per keyword, which is a much bigger,
  separate research task than "finish using the tool," not a quick check. Flagging as
  available for a dedicated future session rather than doing a shallow pass now.
- **`seo-ahrefs`, `seo-dataforseo`, `seo-seranking`, `seo-profound`, `seo-firecrawl`,
  `seo-image-gen`** — all need paid API keys/credentials this environment doesn't have.
  Genuinely blocked, not skipped.
- **`seo-local`, `seo-maps`, `seo-hreflang`** — not applicable (no physical location, single
  language/region).
- **`seo-google`** — blocked for PageSpeed/CrUX/GA4 (no API key), but Search Console
  verification was checked directly and independently confirmed: `dig +short TXT
  themodestyhouse.com` returns a live `google-site-verification=` record. Already set up,
  nothing to do.

## Real Unlighthouse results (24 routes, mobile, production)

| Metric | Range | Notes |
|---|---|---|
| SEO | 100% on 23/24 routes | The exception is `/favourites` at 66% — verified via its Lighthouse audit detail that the ONLY failing check is `is-crawlable: Page is blocked from indexing`, i.e. the noindex added earlier today working exactly as intended. Not a defect. |
| Accessibility | 96-100% | |
| Best Practices | 79-100% | `/modest-tops` dipped to 79% on third-party-cookie/source-map/DevTools-issue flags — generic Chrome noise unrelated to SEO, not chased further; out of this session's scope. |
| Performance | 58-97% | Worst: `/directory` and `/hijabi-outfits`, both 58% — matches CLAUDE.md's own already-documented landmine (heaviest pages, columnar payload already reduced this once). Best: `/favourites` (97%, near-empty page) and `/terms` (92%). |

## What changed as a direct result

Capturing the `/faq` drift baseline surfaced something real: `h2_count: 0` on a page with 10
visible questions. The questions are rendered by the shared `HowBlocks` accordion component
(also used on `/about`) as a styled `<span>`, not a heading — invisible to both
heading-navigation (accessibility) and `seo-geo`'s explicit "question-based headings" AI-
citability signal.

- **`components/HowBlocks.tsx`** — the disclosure button is now wrapped in a real heading
  (WAI-ARIA Accordion Pattern: heading wraps the trigger, not the reverse), level controlled
  by a new `headingLevel` prop (`'h2' | 'h3'`, default `'h3'`). The step-number span
  (`"01"`) gets `aria-hidden="true"` so it doesn't pollute the heading's accessible name —
  screen readers hear "What is an abaya?", not "01 What is an abaya?".
- **`app/faq/page.tsx`** — passes `headingLevel="h2"` (the page has no other h2 for these to
  nest under). `/about`'s existing call is unchanged and still defaults to `h3` (correct there
  — it already sits under a real h2).

## Verification

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npx vitest run
(clean — 480/480, no new test needed, existing suite covers no regression)
$ npm run build
(32 routes, unchanged)
```

Production build, curled directly:
```
/faq    <h2> count: 10 (was 0)
/about  <h3> count: 5 (unchanged — same 5 HOW steps, same heading level as before)
```

## Notes / follow-ups
- `seo-sxo`/`seo-cluster` (SERP-backwards competitive analysis) are real, unrun capabilities —
  worth a dedicated session if wanted, not a quick add-on.
- Common Crawl confirms zero backlink footprint. Free Moz/Bing Webmaster API signup would
  give a fuller picture (`claude-seo run backlinks_auth.py --check`) but needs an account only
  Tina can create.
- Unlighthouse is now installed and reusable for future sessions:
  `claude-seo run unlighthouse_run.py <url> --device mobile --max-routes N`.
