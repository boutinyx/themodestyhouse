# robots.txt / llms.txt decision + crawlability audit
**Date:** 2026-08-08 · **Status:** done (audit only — no code applied)

## Goal
Tina asked whether we should make a `robots.txt` and an `llms.txt`. Answer the question with
evidence rather than assumption, and find out what actually limits this site's visibility to
search engines and AI assistants.

## What changed
No application code was touched. The working tree carries another session's Style-It work
(24 modified files); it was left alone and verified untouched
(`git diff | grep -E 'canonical|llms|noindex|CCBot'` → no matches).

- `CLAUDE.md` §8 — four stale Frontend landmines corrected against measurements taken today.
  Per §1, a fact discovered stale is fixed in the session that finds it.
- This log entry.

Artefacts were drafted and build-verified by the audit, then reverted; they are recorded in
the workflow output (see Notes) rather than applied, because applying them is Tina's call and
several are ranked below higher-value work.

## Verification

**robots.txt already exists** — `app/robots.ts`, live in production:
```
$ curl -s https://themodestyhouse.com/robots.txt
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://themodestyhouse.com/sitemap.xml
```

**llms.txt does not** — `https://themodestyhouse.com/llms.txt` → `404`.

**AI crawlers are not being blocked.** Probed production directly rather than reading
Cloudflare's defaults (§10.23 — a directive is not a behaviour):
```
GPTBot         200
ClaudeBot      200
PerplexityBot  200
OAI-SearchBot  200
Googlebot      200
```
No `cf-mitigated`, no challenge interstitial. Cloudflare's managed robots.txt is off
(origin serves 107 bytes; zero matches for `content-signal`/`GPTBot`).

**Zero products are hyperlinked anywhere:**
```
$ for p in / /directory /hijabi-outfits /modest-dresses /style/elegant; do
    curl -s "https://themodestyhouse.com$p" -o /tmp/pg.html -w "raw=%{size_download}B "
    grep -o 'href="[^"]*products/[^"]*"' /tmp/pg.html | wc -l
  done
/                  raw=117432B    product_anchors=12   (all outbound, homepage rail)
/directory         raw=3576138B   product_anchors=0
/hijabi-outfits    raw=5186203B   product_anchors=0
/modest-dresses    raw=932406B    product_anchors=0
/style/elegant     raw=2869885B   product_anchors=0
```
`components/ProductCard.tsx:51` is a `<button onClick={() => open(p)}>`, not an `<a>`.

**Catalogue and community field:**
```
$ node -e "console.log(require('./data/products.json').length)"
11203
$ community counts: { hijabi: 10919, general: 284 }   non-hijabi: bouguessa 248, hum 36
```
So `/hijabi-outfits` matches 97.5%, not "every product" as §8 claimed.

**Sitemap:**
```
$ curl -s https://themodestyhouse.com/sitemap.xml | grep -c '<loc>'      -> 20
$ curl -s https://themodestyhouse.com/sitemap.xml | grep -c '<lastmod>'  -> 0
```
20 = 8 static + 12 lanes. Missing: 3 `/style/[vibe]`, 2 `/editorial/[slug]`.

**llms.txt adoption, independently checked** (not taken from the subagents):
- Ahrefs, 137,210 domains, May 2026: only 3% of `llms.txt` files received any request at
  all. The retrieval crawlers that feed AI answers barely register.
  <https://ahrefs.com/blog/llmstxt-study/>
- Google Search Central, updated 2026-06-15 ("Clarifying guidance on llms.txt files"):
  no effect, positive or negative, on Search rankings or AI Overviews — Search does not use
  the file. Site owners do not need it to appear in Search "including its generative AI
  capabilities."
- A ~300k-domain correlation study found no significant relationship with AI citations;
  removing llms.txt from the predictive model *improved* accuracy.
- No frontier lab (OpenAI, Google, Anthropic, Meta, Mistral) has an on-record commitment
  that production retrieval reads a third-party `/llms.txt`. Claims to the contrary conflate
  *publishing* one with *consuming* one.

## Notes / follow-ups
Ranked by impact on AI/search visibility, highest first:

1. **No product has a URL.** 260 of 11,203 (2.32%) render as cards; none are linked. AI
   assistants cite pages — we offer ~26 citable pages. The implementation and measurements
   already exist in `docs/log/2026-08-05-product-pages-and-descriptions.md`. Nothing else on
   this list is within an order of magnitude. Gated on the page-weight reasons it was pulled.
2. **Sitemap misses 5 served URLs**, and 3 of them (`/style/*`) are linked from nowhere in
   any server-rendered HTML. Six lines of `app/sitemap.ts` + widening the Footer's
   `CATEGORY_LANES.slice(0, 6)`.
3. **Canonicals.** `/directory?q=<anything>` → 200, 3.52 MB, no canonical, and `HeroSearch`
   emits one such URL per user query. `/designers?page=999|abc|-3` → 200, no canonical
   (`app/designers/page.tsx` clamps rather than 404s). `/contact?topic=` is the one already
   done right. Two one-line `alternates: { canonical }` additions.
4. **`/favourites` noindex.** Thin always-empty page, linked from Header/Footer/MobileNav on
   every page, no noindex from any source. Must go in a new `app/favourites/layout.tsx` —
   `page.tsx` is `'use client'` and Next 16.2.12 fails the build on `metadata` exported from
   a client module.
5. **robots.txt hardening.** Optional. Blocking extraction-only agents (`CCBot`, `Diffbot`,
   `Timpibot`, `Applebot-Extended`) costs zero referrals. **Trap:** per Google's spec, named
   groups and `*` are *not* combined — any group added must repeat the `/admin/` and `/api/`
   disallows verbatim or that bot stops inheriting them (relevant given P0-A history).
6. **llms.txt.** Expected return: zero, on today's evidence. Worth 20 minutes only as a
   generated route (`app/llms.txt/route.ts` from `LANES`/`VIBES`/`getPosts()`, so it cannot
   drift), never `public/llms.txt` — Railway caches `public/` for 4h without fingerprinting
   and this file cannot be renamed to bust it, because its path *is* the spec (§6, §10.21).

Sequencing caveat: P0-E means outbound links are not yet monetized, so discovery work
shipped before the link rewriter earns £0 per referral won.

Full audit output (31 agents, 101 claims extracted, 21 adversarially verified, 8 refuted or
corrected): `.claude/projects/…/subagents/workflows/wf_513d6638-48b/journal.jsonl`.
