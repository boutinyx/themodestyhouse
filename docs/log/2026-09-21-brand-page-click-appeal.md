# Brand pages: a search result worth clicking, and photos sooner on a phone
**Date:** 2026-09-21 · **Status:** done on `staging` (`46aeead`), verified there; NOT on `main` — awaiting Tina's approval

## Goal
Tina: pages get thousands of impressions and almost no clicks because the result is not appetising,
and visitors who do arrive see nothing that rewards them. Fix both before the end of September.

## What the numbers say (read, not assumed)
- Search Console: "merrachi" 2,308 impressions / 3 clicks (0.13%). Title was "N pieces & prices".
- Pulse, 28 days (dashboard read in Tina's logged-in browser): 625 people, bounce 55% (down 4.9pp),
  2.2 pages/visit, 1m30s average visit, scroll depth 81% / 62% / 48% / 13% at 25/50/75/100%.
  Sources ChatGPT 35%, Instagram 26%, Google 20%. **Top outbound click is diversitymodest.com** — for
  a directory a visit that ends in a click to the brand is the intended outcome, and Pulse counts it
  as a bounce. So 55% overstates the problem; a bounce rate that excludes outbound clicks has not
  been measured (Pulse key cannot read, see below).
- Entry pages: `/` 59%, lanes ~30%, brand pages are not a main entry.
- Brand page on iPhone 13 width, production: first product photograph started 554px down an 844px
  screen, under an eyebrow, h1, four fact blocks, a button and the claim line.

## What changed (`app/designers/[slug]/page.tsx`, all 91 brand pages)
1. **Title** leads with something concrete: `Diversity Modest — 61 pieces from €39`. Where the cheapest
   piece is under 40% of the median (43 of 113 houses — a cotton undercap, gloves) it leads with
   `half under £27.95` instead, so "from £6" never oversells.
2. **Description** names what is inside: `Browse 61 Diversity Modest pieces: hijabs, dresses and tops,
   €39–€142.05. Prices in your own currency, checked nightly. Based in Europe.` Top three garments
   by count, measured from the house's own rows; no adjectives about the brand (§10.18).
3. **Mobile first screen**: top padding and stack gaps reduced below `md` only. Same elements, same
   order; the photographs start sooner.

## Verification
```
npx tsc --noEmit                exit 0
eslint app/designers/[slug]     exit 0
vitest                          1311 passed, 1 failed — lib/colourLeads.test.ts, fails identically
                                with my change stashed (pre-existing, CI-skipped)
generateMetadata over all 91    title max 60, 0 over 60 · description 125-160, 0 over 160
```
Staging (`themodestyhouse-staging-production.up.railway.app`), after deploy:
```
/designers/diversity-modest   title  "Diversity Modest — 61 pieces from €39 | The Modesty House"
                              first product card top, iPhone-width 390x844, chromium AND webkit:
                              554px (production) -> 490px (staging)   = 64px sooner, modest
```

## Who arrives from search (Search Console, 2026-08-24..09-20, by page type)
```
brand pages     90 pages   8,968 impr (61%)   32 clicks  0.36% CTR  avg pos  7.5
category pages  68 pages   4,119 impr (28%)   27 clicks  0.66% CTR  avg pos 30.7
editorial/edits 10 pages     876 impr ( 6%)   21 clicks  2.40% CTR  avg pos 13.4
homepage         1 page      839 impr ( 6%)   22 clicks  2.62% CTR  avg pos 38.6
total                     14,802 impr        102 clicks
```
Tina's suspicion that clothing searchers are few is right: category pages earn 27 clicks at position ~31.
Editorial converts best. Pulse could not be read by API (see below), so on-site behaviour by entry page is unmeasured.

## Not established / follow-ups
- Whether a new title lifts CTR is only knowable from Search Console after Google re-crawls (days).
  Compare CTR on the same pages before/after, not impressions.
- Homepage is 59% of entries and its first screen has not been looked at.
- **Pulse API works — I had the route wrong.** Keys use `/api/public/v1/`, not `/api/v1/`; the earlier
  "ingest-only key" conclusion (and the 2026-09-09 note) was mine and false. Bearer, server-side only.

## Pulse, 2026-09-04..09-21 (public API; filtered cells with <5 visitors are withheld)
```
ALL                338 visitors  bounce 56.4%  85s   scroll 59%
by channel         Organic Search 96 (bounce 65.7%) · AI 144 (50.0%) · Direct 64 (59.5%) · Organic Social 37 (51.4%)
page                    visitors  bounce   avg time  scroll | Organic Search only
/                         168     86.0%     26s      45%   |  24 visitors, 96% bounce, 25s
/modest-dresses            50     88.2%     68s      68%   |  11, 81.8%
/new-in                    48     86.5%     42s      63%   |   9, 100%
/modest-sets               36     71.1%     90s      74%   |  15, 68.8%
/modest-abayas             26     88.9%    158s      78%   |   8, 87.5%
/designers/merrachi         9     88.9%     52s      51%   |   7, 85.7%
/designers/diversity-modest 5    100%       13s      66%   |  withheld
```
Reading: the homepage is the leak — 168 visitors, 26s, 45% scroll. Lane pages bounce 70-89% but with
68-158s and 68-78% scroll: people browse, then leave (probably via an outbound click, which Pulse counts
as a bounce). Brand pages get almost no visitors from any source.

## Merged to `main`, 2026-09-22
```
git merge --ff-only staging   9fd349a..a6d0840, fast-forward
origin verified new           "Diversity Modest — 61 pieces from €39 | The Modesty House"
                               2 min after push
cf-cache-status: DYNAMIC       (this route is not edge-cached at all, per §10.23 — no purge needed,
                               ran one anyway, harmless)
```
Live on production for all 91 brand pages. Tina's approval: "btw you can merge the things", 2026-09-22.
