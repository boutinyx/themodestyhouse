# Inoma Digital SEO audit (11 Sep 2026) — checklist, verification and fixes
**Date:** 2026-09-15 · **Status:** technical items done except two that are Tina's call

Source: `The_Modesty_House_SEO_Audit_Report` (Google Sheet, 10 tabs), read via its own export.
Their crawl: 100 pages. Site Health 94%, Performance 100%, Markup 100%, Crawlability 94%,
HTTPS 98%, Internal Linking 89%.

Every item was re-measured against the LIVE site before anything was changed. Fixes are on
`staging` (`9db0b25`, `aae823b`) and verified there, not on `main`.

## Phase 1 — quick technical fixes

| # | Their claim | Verified | Action | Status |
|---|---|---|---|---|
| 1.1 | 1 page returns 4xx | `/cdn-cgi/l/email-protection` — Cloudflare's own endpoint, not a page of ours. `email_obfuscation` is `on` in the zone (read via the API), which rewrites `mailto:hello@themodestyhouse.com` into that URL; requested without its token it 404s | Leave the feature on (it is anti-spam) or turn it off in Cloudflare. A zone setting, so **Tina's call** | open — needs a decision |
| 1.2 | 5 broken internal links | Same cause: the email-protection URL appears 8× across 3 pages — `/contact` ×1, `/privacy` ×5, `/terms` ×2. No other internal link on the site is broken (all 160 sitemap URLs return 200, self-canonical, indexable) | Same decision as 1.1 | open — same decision |
| 1.3 | 5 title tags too long | Measured across all 160 sitemap pages: **>60: 25 · >65: 19 · >70: 15 · >75: 5**. Their "5" is the **>75-character** count — the only threshold in range that gives exactly 5 (>74 gives 7, >76 gives 2; no pixel threshold gives 5 either). The five: `/modest-swimwear` 79, `/editorial/still-boiling-feeling-fall` 79, `/edits/fall-essentials` 76, `/editorial/where-to-buy-hijabs-online` 76, `/editorial/best-abaya-brands-price-tiers` 76. Systematic cause: every title carries the 20-character ` \| The Modesty House` suffix | Titles are copy, so not rewritten here (§10.18). The list is ready to hand to the agency that now writes copy | open — copy decision |
| 1.4 | 10 broken external links | **Two genuinely dead**, each verified against a live same-host sibling as a control: `hidayah.dk/…-laurel` 404 and `nouralhouda.com.au/…-teal` 404. **Two that were NOT dead** — the `losyana.nl` links; see the correction below. The full sweep found **50 dead products across 2,524 outbound URLs**, 44 of which redirect to the brand's homepage rather than 404 | The two dead ones repaired against live URLs. The two `.nl` links were repointed at `losyana.shop` on a false premise — a curation choice for Tina, not a repair. `voilechic.com/…-charcoal-grey` on `/edits/jersey-hijabs` is still dead and is a hand-picked item, so its replacement is hers | 2 repaired, 3 open |
| 1.5 | 1,486 links with no anchor text | Measured across 7 page types, 630 anchors: 504 have visible text, 119 have an `aria-label`, 7 wrap an image with alt, **0 have nothing at all**. A lane page is 30.3% text-less against their 31.1% site-wide, so the tool is counting text nodes and ignoring `aria-label`. The dominant pattern is `ProductCard.tsx`'s full-card overlay anchor, which is deliberate (a `<button>` inside an `<a>` is the `nested-interactive` a11y violation this component was rewritten to remove) | No fix. The tool counts visible text only; Google uses `aria-label` as the link text | closed — not a defect |
| 1.6 | 1 subdomain without HSTS | `themodestyhouse.com` sends `max-age=63072000; includeSubDomains`; so does the Railway staging host. The one response without it is `www.themodestyhouse.com`, a 301 to the apex. **Cause:** the header is emitted by the app (`next.config.ts:145-146`) and the www→apex redirect is a Cloudflare EDGE redirect that never reaches Railway, so Next never adds it | Fix belongs at Cloudflare, not in the repo. Exposure is only a first-ever visit starting at `www` over plain HTTP, since the apex sends `includeSubDomains` | open — low value |

## Phase 2 — structural

| # | Their claim | Verified | Action | Status |
|---|---|---|---|---|
| 2.1 | 16% of crawled pages missing from sitemap | 10 real pages: 6 thin `?type=` subtype pages (deliberately withheld — `lib/laneSubtypes.ts`), `/favourites` (noindex), `/new-in?hijabs=1`, `/designers?page=2,3`. The `?topic=claim` contact links are one form, correctly canonicalised | **No action.** `app/sitemap.ts` already documents the `/designers?page=2` exclusion, and re-adding the thin pages would repeat the duplicate-subtype problem fixed in `b9a93ed` | closed — deliberate |
| 2.2 | 6% of pages lack a canonical tag | Product pages and `/favourites` — the only two | Both now self-canonical. The bot-scoped noindex on product pages is untouched | **done** |
| 2.3 | Low text-to-HTML ratio on 93 pages | Structural: a grid page ships the columnar catalogue payload (`lib/compactCatalogue.ts`), which is data, not markup. `/modest-dresses` is 479 KB of which the visible text is a fraction | No fix that does not undo the payload work | closed — inherent |
| 2.4 | 3 pages with only 1 incoming internal link | Measured across all 160 sitemap pages: `/edits` had **zero** inbound links anywhere (every individual edit was linked, the index was not) and `/editorial/still-boiling-feeling-fall` had one | Footer now links `/edits`; every editorial post now lists the three most recent other posts | **done** |
| 2.5 | Low semantic HTML on 14 pages | Checked 16 page types: every one has `<main>`, `<header>`, `<footer>`, `<nav>` and exactly one `<h1>`. `<article>` appears only on an editorial post, which is the only page that IS one. `<aside>` and `<h3>` are zero site-wide. The one page where the complaint has substance is **`/designers`** — zero `<section>` and zero `<h2>`, a bare grid under one h1 | No code fix. A notice-level heuristic; `/designers` structure is worth revisiting when that page is next touched | closed |

## Also fixed while verifying (not on their list)
- **45 of 91 brand pages carried a meta description over 160 characters** (range 142–183,
  longest `/designers/noureen` at 183), over Google's cut, and a house with its own prose was
  `.slice(0, 158)` — cut mid-word. `lib/metaDescription.ts` now drops whole trailing clauses
  instead, with 7 tests. Verified on staging: 124–159 chars.
- **Two hand-written descriptions are still over**: `/editorial/where-to-buy-hijabs-online` at
  192 (the longest on the site) and `/edits/fall-essentials` at 175. Both are prose in
  frontmatter, so they are Tina's or the agency's to shorten, not this session's.
- **CLAUDE.md §8 corrected**: `/hijabi-outfits` redirects to `/new-in`, not `/directory`, and
  `/directory` itself now redirects to `/new-in`. Re-measured on production.

## Correction — `losyana.nl` is NOT dead, and this session said it was

`curl https://losyana.nl/...` returned `http=000` on this machine, which was read as a dead
domain and written into commit `9db0b25`'s message ("losyana.nl is a closed storefront") and
into the table above. **Both are wrong.** Re-checked 2026-09-15 with DNS-over-HTTPS and an
explicit `--resolve`:

```
cloudflare-dns.com A losyana.nl        -> 23.227.38.65 (Shopify)
local getaddrinfo('losyana.nl')        -> FAIL, "nodename nor servname provided"
curl --resolve losyana.nl:443:<ip>     -> 200, title "Emirate abaya - black - Losyana.nl"
```

**This machine's own resolver fails on that host while the site is live.** `http=000` from
`curl` is a connection failure, which is not the same finding as a 404 — §10.26's rule, missed
here: the harness was the thing that was broken. A peer session caught it.

Consequences, stated plainly:
- The two `losyana.nl` links in the editorial posts **were working**. Repointing them at
  `losyana.shop` is defensible as curation — `.shop` is the storefront `data/brands.ts` and the
  whole catalogue now point at, and the GoAffPro code only pays there — but it was **not** a
  broken-link repair, and the abaya link now lands on the storefront root rather than the exact
  product the sentence names, which `.nl` still sells in black. Tina's call, raised with her.
- The other two repairs are confirmed genuinely dead, each against a same-host control that
  had to read 200: `hidayah.dk/…-laurel` 404 (sibling `…-teal` 200) and
  `nouralhouda.com.au/…-teal` 404 (sibling `…-oyster` 200).
- **Any link checking from this machine must use DoH + `--resolve`** (`/tmp/dohcheck.sh`), or a
  resolver failure will keep reading as a dead brand.

## Outbound link sweep — 2,524 external URLs, 50 dead products

Run across 114 of our pages (all 91 designer pages, all 5 posts, all 3 edits, the static pages).
0 rate-limited. 50 distinct dead products, of which:

- **5 are a hard 404 everywhere**: `jawda.co.uk` ×2, `manzaram.nl` ×2, `hidayah.dk/…-laurel`.
- **44 silently redirect to the brand's homepage**, so a visitor lands on a front page with no
  sign the piece is gone. Worst: `getfith.co` 12, `int.toucheprive.com` 8, `glowmodesty.com` 7,
  `voilechic.com` 4, `nouralhouda.com.au` 3, `kamin.ae` 3.
- **1 redirects to a collection page** (`jennah-boutique.com`).

Two things this exposes that are bigger than the audit:
1. **"Broken" is header-dependent.** With an `Accept:` header these Shopify stores 302 a dead
   product to the homepage; without one they 404. Reproduced 3/3 each way. A link checker that
   follows redirects scores all 45 redirect cases as healthy — which is probably why the audit
   tool reported 10 rather than 50.
2. **The catalogue is carrying dead rows.** All four `Ribbed Jersey Hijab` URLs from Voile Chic
   404 while a chiffon sibling returns 200, so that line is discontinued at the brand and still
   published here — including the charcoal-grey piece hand-picked into `/edits/jersey-hijabs`.
   `docs/log/2026-09-03-weak-site-hypothesis-failed-and-718-dead-links.md` is the same failure
   recurring. **A scheduled dead-link sweep is the real fix and does not exist.**

## Phase 3 — growth
Content, keywords and link building. Not technical; reviewed separately in
`2026-09-15-inoma-content-plan-review.md`.

## Verification
```
npx tsc --noEmit                    exit 0
npm run lint                        exit 0
npm test                            1222 passed, 1 failed — lib/colourLeads.test.ts,
                                    pre-existing and CI-skipped (see 2026-09-12 log)
staging, after deploy:
  /product/nihan/15000506827115     canonical present · googlebot noindex, nofollow intact
  /favourites                       canonical present · robots noindex, follow intact
  /editorial/best-abaya-…           3 related-post links · no losyana.nl anywhere
  /editorial/where-to-buy-hijabs…   3 repaired outbound URLs present
  /designers/{niswa,merrachi,…}     meta description 124–159 chars
  footer                            href="/edits" present
```

## Tina's decisions, 2026-09-15
1. **Cloudflare email obfuscation stays ON.** The 4xx and the "5 broken internal links" are
   therefore expected and permanent; they are Cloudflare's endpoint, not a page of ours.
2. **The "Emirate Abaya in black" sentence stays as written.** ⚠️ **This decision was taken on
   a false premise** — she was told the old link was dead. It was not: `losyana.nl` serves that
   exact garment, in black, today. The link currently points at `losyana.shop`'s root. Re-asked
   2026-09-15, still open: keep the new storefront (where her affiliate code pays) or restore
   the deep link to the piece the sentence names (which pays nothing).
3. **The site-name suffix is dropped on titles that run over.** `lib/metaTitle.ts`, threshold 75
   rendered characters, applied in `lib/seoCopy.ts` and the editorial/edits slug pages. The five
   flagged titles now render at 56-59 characters; the other 20 over 60 keep the suffix and are
   left to whoever writes shorter headlines.
4. **Merged to `main`** — everything on staging, including another session's 13 Sep
   agent-discovery work, which she approved shipping in the same breath.

## Live on production, verified after the Cloudflare purge (§10.47 order)
```
origin polled with a cache-buster until the new build appeared, THEN purge_everything: True
GET #1 /modest-swimwear   cf-cache-status MISS · title 59 chars (was 79)
GET #2 /modest-swimwear   cf-cache-status HIT · age 0 · title 59 chars
/product/nihan/…          canonical present · googlebot noindex, nofollow intact
/favourites               canonical present
/editorial/best-abaya-…   3 related-post links · losyana.nl absent
/                         footer links /edits
/designers/noureen        meta description 134 chars (was 183, the longest on the site)
```
