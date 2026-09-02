# What Pulse and Search Console say, and what to fix next
**Date:** 2026-09-02 · **Status:** done (analysis only — no code changed)

## Goal
Read the two live sources of truth — Pulse (ciphera.net) and Google Search Console —
and turn them into a ranked list of SEO work, rather than guessing at it.

## How the data was pulled

**GSC** — `gcloud auth application-default print-access-token` + the mandatory
`x-goog-user-project` header, per `docs/seo/README.md`. Search Analytics by date, query,
page, country, device; URL Inspection on 12 representative URLs; `sitemaps.list`.

**Pulse** — `PULSE_API_KEY` from `.env` does **not** work against
`https://pulse-api.ciphera.net/api/v1/sites`: `Bearer <key>` returns
`{"error":"Invalid token"}` and every other header name returns
`{"error":"Authentication required"}`. Session auth is an httpOnly cookie on
`pulse.ciphera.net`, so the queries were run from that page's own context via
Claude-in-Chrome. Endpoint names were read out of the dashboard's JS bundle rather than
guessed: `/api/v1/sites/{id}/stats`, `/pages`, `/referrers`, `/countries`, `/devices`,
`/goals/stats`, all taking `startDate` / `endDate`.

## What the numbers say

### Pulse — 2026-08-03 → 2026-09-01

```
427 visitors · 457 visits · 1,038 pageviews
bounce 57.3% · avg visit 2m 50s · avg scroll depth 49%
outbound_click  259 events / 105 visitors  →  24.6% of all visitors leave for a brand
mobile 320 visitors · desktop 90
US 175 · NL 31 · GB 30 · CA 20 · IN 18 · FR 16 · DE 12
```

Referrers, by visitors, after folding the variant spellings Pulse records separately:

| source | visitors |
|---|---|
| Instagram (`l.instagram.com` 109 + `Ig` 14 + `Instagram` 7) | ~130 |
| **ChatGPT (`ChatGPT` 83 + `chatgpt.com` 18 + 1)** | **~102** |
| Direct | 93 |
| Shared Link | 49 |
| **Google (`google.com` 50 + `google.nl` 1)** | **~51** |
| Reddit (3 variants) | ~19 |
| Pinterest | ~11 |

### GSC — 28 days to 2026-08-30

```
32 clicks · 3,700 impressions · CTR 0.86% · first day with any data 2026-08-07
week of 08-03    1 click     49 impressions
week of 08-10    4 clicks   139 impressions
week of 08-17    3 clicks   468 impressions
week of 08-24   24 clicks  3,044 impressions
```

Impressions are up ~62x in four weeks. The clicks are not following, and the query
breakdown says exactly why: the impressions are almost all **navigational brand-name
searches where we rank below the brand's own site**.

```
merrachi          380 impr  pos  6.5   0 clicks
jawda modest      169 impr  pos  6.5   0 clicks
hawaa clothing    123 impr  pos  8.6   0 clicks
abaya buth        113 impr  pos  8.8   0 clicks
nour al houda      40 impr  pos  6.2   0 clicks
emlavish           38 impr  pos  6.2   0 clicks
alia anggun        35 impr  pos  8.7   0 clicks
klaythelabel       33 impr  pos  9.2   0 clicks
lameera moda       32 impr  pos  6.9   0 clicks
```

The category head terms are the mirror image — the intent we actually want, at a position
nobody sees:

```
modest tops              24 impr  pos 76.5
modest blouses           28 impr  pos 71.9
modest fashion           22 impr  pos 71.0
modest activewear        40 impr  pos 62.5
hijab stores online      18 impr  pos 59.2
modest coords            25 impr  pos 57.8
modest co ords for women 23 impr  pos 47.7
```

Best non-brand page on the site, by CTR: `/editorial/best-abaya-brands-price-tiers`
— 3 clicks / 56 impressions / 5.4% / pos 9.6.

## Findings, ranked

### 1. ChatGPT sends twice Google's traffic, and the lane answers aren't machine-readable
~102 visitors vs ~51 in 30 days. The plumbing is already right — `robots.txt` explicitly
allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, Claude-User,
PerplexityBot, Google-Extended and CCBot; `/llms.txt` and `/llms-full.txt` (56 KB) are live.

The gap is that **all 14 lane answer blocks in `lib/laneAnswers.ts` are real Q&A prose
rendered as an `<h2>` question plus ~150 words, and none of them emit `Question`/`Answer`
schema.** `faqPage()` already exists in `lib/schema.ts` and is used on `/faq` only
(10 Q&A pairs, correctly emitted). Adding it to the lane pages is 14 pages of existing,
already-written content becoming machine-readable.

Say the caveat out loud: Google restricted FAQ **rich results** to government and health
sites in 2023, so this will not draw an accordion in the Google SERP. Its value is that
AI answer engines parse the structured form, and that is where our traffic is coming from.

### 2. ~1,500 impressions/month on brand names, converting at zero
Head-on this is unwinnable and should not be attempted: someone typing "merrachi"
wants merrachi.com, and Google is right to put them there. The winnable version is the
modifier query — *merrachi review*, *brands like merrachi*, *merrachi sizing*, *is merrachi
worth it* — where a directory can legitimately outrank a shop.

**CORRECTION, made the same day.** The first version of this section said the designer
pages "answer none of those and link to no other house". Both halves were wrong, and the
way I got them wrong is worth more than the finding: I ran
`grep -o '<h2[^>]*>[^<]*</h2>'` over the rendered page, got nothing, and concluded there
were no sections. React renders an interpolated heading as
`What <!-- -->MERRACHI<!-- --> makes`, so a character class of `[^<]` cannot match it —
the same grep found the h2 on `/modest-tops`, whose heading is a static string, which is
exactly what made the empty result look like a fact about the page. Parsing the HTML
properly shows four sections already there since 2026-08-31: *What MERRACHI makes*,
*MERRACHI prices*, *Where to buy MERRACHI*, and *More houses in Europe* (a deterministic
eight-house ring over `lib/brandRegions.ts`). §10.38 rule 2, again: never characterise a
page's content from a pattern-matched dump.

What is genuinely missing is that none of it is machine-readable — three real questions
answered in prose under headings phrased as statements, which an answer engine has no
reason to read as a Q&A.

### 3. The six biggest lanes have no `?type=` subtype pages at all
All 14 subtype URLs in the sitemap belong to specialty lanes:

```
/modest-swimwear    6      /modest-dresses    0
/modest-activewear  5      /modest-abayas     0
/modest-hijabs      4      /modest-skirts     0
/layering-basics    2      /modest-tops       0
/blazers-vests      2      /modest-trousers   0
/cardigans-sweaters 2      /modest-sets       0
```

`LANE_SUBTYPES` in `lib/laneSubtypes.ts` is keyed only to the five specialty domains in
`lib/specialty.ts`. Search demand is for precisely what's missing — "modest co ord set"
(23 impr, pos 48.3), "modest coords" (25, 57.8), "modest blouses" (28, 71.9), "abaya for
wedding guest", "abayas for wedding guest". `data/dress-subtypes.json` already classifies
407 dresses into everyday / occasion / slip, so part of the raw material exists.

### 4. Editorial is the only thing that ranks on merit, and there are four of them
The abaya price-tiers piece is the highest-CTR non-brand page on the site and sits at
pos 9.6. Related queries already register: "best abaya brands" (pos 15), "popular abaya
brands" (8 impr, pos 12.3), "abaya brand name list" (pos 4.5). Roundup and comparison
editorial is both what Google ranks here and what AI engines quote.

## Checked and NOT a problem — do not chase these

- **`sitemaps.list` reports `"indexed": "0"` against 143 submitted.** That field is
  deprecated and always returns 0. URL Inspection on 12 URLs returned
  `Submitted and indexed` for `/`, `/directory`, `/modest-abayas`, `/modest-dresses`,
  `/modest-hijabs`, `/modest-tops`, `/designers`, `/designers/merrachi`,
  `/designers/hawaa` and `/edits`.
- **`/new-in` — "URL is unknown to Google".** It shipped 2026-09-01, is in the sitemap,
  and Google last downloaded the sitemap 2026-08-31. Nothing is wrong; it has not been
  crawled yet (§10.38 rule 1).
- **`/designers/jawda-modest` — "URL is unknown to Google".** My URL was wrong. The slug
  is `jawda`; the page exists and is indexed. Harness error, not a site defect (§10.26).
- **25 of 117 brands have no `/designers/` page.** Deliberate: `MIN_PRODUCTS = 24` in
  `lib/brandPages.ts`, overridden by a hand-written description. None of the 25 appears
  in GSC with a single impression, so nothing is being lost today.
- **Schema.** `/` carries Organization + WebSite + SearchAction; lane and designer pages
  carry BreadcrumbList + CollectionPage + ItemList (+ Brand on designer pages); editorial
  carries Article. Only the lane FAQ blocks are missing markup (finding 1).

## Verification

Every figure above is from a live API call made 2026-09-02, not from a cached snapshot.
GSC window is 2026-08-03 → 2026-08-30 (Google lags ~2 days); Pulse window is
2026-08-03 → 2026-09-01. Raw scripts were written to `/tmp` and are not committed.

Re-run the GSC half with `node scripts/seo-snapshot.mjs`, which writes a dated JSON to
`docs/seo/`. The last committed snapshot is 2026-08-19 (5 clicks / 219 impressions over
365 days) — the growth above is measured against that.

## Notes / follow-ups
- Nothing here has been implemented. Findings 1 and 2 are the cheapest; 3 is a real
  feature; 4 is Tina's writing, not mine (§10.18).
- Pulse's read API has no documented key path. If `PULSE_API_KEY` is meant to work for
  reads, it does not today — worth raising with Ciphera, otherwise every future Pulse
  pull needs a logged-in browser.
- `docs/seo/README.md` asks for a fresh `seo-snapshot.mjs` capture 4–6 weeks after
  2026-08-19; that is due ~2026-09-16.

---

## Update, same day: findings 1–3 implemented

Tina: *"do everything necessary"*. Findings 1, 2 and 3 are built, verified and pushed —
see `docs/log/2026-09-02-lane-subtype-pages-and-faq-schema.md`. Finding 4 (more editorial)
is deliberately NOT done: those are articles in her voice, and §10.18 is explicit that
writing them is not mine to do.
