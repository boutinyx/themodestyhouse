# What to write next, chosen from Search Console data
**Date:** 2026-08-26 · **Status:** done (research — no code changed)

## Goal
Tina asked which editorial piece to make next. Answer it from real Search Console
data for `sc-domain:themodestyhouse.com`, not from taste.

## Method
`gcloud auth application-default print-access-token` + `x-goog-user-project`
(see the `google-search-console-access` memory), against
`searchAnalytics/query` with `dataState: "all"`, three cuts:
90 days by query and by page, 14 days by query and by page, 28 days by date.

## What the data says

**The site is small and growing.** 28-day impressions total **824**, up from
~12/day mid-August to 100+/day by 2026-08-24. Clicks are still 1–6.

**Almost nothing ranks.** Every generic head term sits at position 45–100:
`modest tops` 78, `modest blouses` 73, `modest dresses` 63, `modest activewear` 61.
More lane copy will not move those in the near term.

**Four things DO rank on page one, and they are all the same shape:**

| page | imp (14d) | position |
|---|---|---|
| `/editorial/best-abaya-brands-price-tiers` | 4 | **2.2** |
| `/designers/glow-modesty` | 21 | **6.8** |
| `/designers/inayah` | 7 | **9.9** |
| `/designers/veiled` | 7 | 15.1 |

The abaya price-tier post was published 2026-08-19 and was at position 2.2 within a
week. The designer pages rank for brand-name queries (`glow modesty` 10 imp pos 6.1,
`glowmodesty` 6 imp pos 6.8, `inayah dress` pos 19.5). Named, data-backed,
brand-level content is the only thing on this domain Google currently ranks.

There is also a live query for the genre itself: **`modest brands comparison`,
7 impressions, position 85.9.**

## The query clusters worth writing into (14-day impressions)

| cluster | imp | best position | catalogue depth |
|---|---|---|---|
| hijab shops — `hijab store online` 15, `online hijab store` 12, `hijab stores online` 11, `hijabs online` 3, `buy hijab` 3, `luxury hijabs` 2 | ~48 | 46 | **5,031 hijabs, 75 brands, 49 with ≥8**, medians $2 → $96 |
| co-ord sets — `modest coords` 14, `modest co ords for women` 12, `modest co ord set` 11, `modest co ord sets` 7, `modest suit set` 3, `modest skirt set` 2 | ~52 | **44** | 602 sets, 64 brands, 21 with ≥8, medians $39 → $135 |
| tops / blouses — `modest blouses` 20, `modest tops` 16, `modest tops women` 6, `modest flowy tops` 2 | ~50 | 73 | 3,223 tops, 77 brands, 48 with ≥8, medians $10 → $324 |
| activewear — `modest activewear` 22, `modest workout clothing` 8, `modest gym wear for ladies` 4, `modest activewear malaysia` 4, `modest athletic wear` 3 | ~41 | 55 | **409 products, 18 brands only** |
| skirts — `modest skirts` 8, `modest apparel skirts` 3, `modest skirt` 2, + long/cheap variants | ~20 | 57 | 1,168 skirts, 64 brands, 29 with ≥8, medians $10 → $250 |

Catalogue figures computed over `data/products.json` (20,056 rows, 110 brands),
prices converted to USD via `data/fx-rates.json`, medians per brand, brands with
fewer than 8 pieces in that garment dropped.

## Recommendation, in order

1. **Where to actually buy hijabs, by price** — the direct answer to
   `hijab store online` / `online hijab store` / `hijabs online`, which is a
   "where do I buy" query the directory is literally the answer to. Deepest data on
   the site: 75 houses, medians from Nurmirè $2 and Hidayah $3 up through Aab $37,
   MERRACHI $55 and Maison Hijab $96. That's a wider real spread than the abaya piece
   had, and it carries its own sub-story for `luxury hijabs` / `quiet luxury hijab` /
   `luxury hijab brands`. `/modest-hijabs` is also the site's #2 page by impressions
   (86) at position 57, so the piece feeds a page that needs the internal link.
2. **The co-ord set houses** — the best generic positions on the whole site (44–57),
   ~52 impressions across six spellings of the same intent, and a clean price story
   from Mariam's $39 to LaMeera $135. Thinnest of the three lanes at 602 pieces, but
   21 houses carry ≥8 sets, which is enough.
3. **Who actually makes modest activewear** — `modest activewear` is the single
   biggest non-brand query on the site (22 imp). Only **18 of 110 houses** make any,
   and four of them make three-quarters of it (Niswa 114, Haute Hijab 75, Urban
   Modesty 70, Dignitii 25). The scarcity is the piece.

Not recommended yet: tops/blouses. Comparable demand, but position 73–100 and 77
brands is a harder, longer piece for the same traffic — worth doing after one of the
three above lands.

## Notes / follow-ups
- The 90-day by-query sum (524) is lower than the 28-day by-date sum (824) because
  Google withholds anonymised queries from the `query` dimension. Use the `date`
  dimension for totals, never the query dimension.
- Brand-name intent is the other open seam: the designer pages rank 6–19 for house
  names with no editorial support at all. A named-house piece is the cheapest way to
  reinforce that, but it needs Tina's own opinion of the brand, so it is a different
  kind of work from the price-tier format.

---

# Addendum: Google Trends (same day)
**Status:** done

## How
No official API. The internal `trends.google.com/trends/api/*` endpoints work, but
429 immediately from a cold client. What made it reliable: seed a cookie jar from
`https://www.google.com/?gl=us&hl=en` then `https://trends.google.com/trends/?geo=US`,
reuse that jar with `curl -b/-c`, pace requests ~5-8s apart, and cache every response
to disk. Client + runners were scratch scripts in `/tmp` (`trends.py`, `run1-5.py`).
Widget flow: `api/explore` returns tokens → `api/widgetdata/{multiline,relatedsearches,comparedgeo}`.

## 1. Relative volume of the three candidate topics (12 months, worldwide)

| month | modest activewear | modest co ord | **hijab store** | modest tops | modest skirts |
|---|---|---|---|---|---|
| Apr 2026 | 11 | 11 | 56 | 32 | 9 |
| Jun 2026 | 11 | 8 | **69** | 30 | 9 |
| Aug 2026 | 6 | 6 | 24 | 22 | 6 |

`hijab store` is 5-10x every other candidate. That independently confirms the #1 pick
from the Search Console pass — it was chosen on our own impressions, and it is also
the biggest real market of the five.

## 2. "hijab" as a bare word is NOT a shopping query
Top related searches for `hijab`: *hijab girl, hijab viral, sotwe, hijab telegram,
samiya hijab, hijab girl pic, hijab girl dp*. That is image-scraping and social
traffic, not commerce. The bare term indexes ~38 against abaya's ~8, and almost none
of that gap is buyers. **Never plan against raw `hijab` volume.**

The commercial hijab modifiers, and they are rising:
- **`instant hijab` +110%**
- **`hijab boutique` +60%**
- **`modal hijab` +50%** (`jersey hijab` and `modal hijab` both in the top list)

That is a fabric-and-format question — jersey / modal / chiffon / instant — and it is
a piece we can answer from the catalogue.

## 3. Abaya: rising queries are about STYLE, not price
`lace abaya` +180%, `floral abaya` +150%, `luxury abaya` +130%, `pashmina abaya`
+750%, `buy abaya online` +200%, `abaya near me` +170%, `abaya stores near me` +120%.
Top list carries `open abaya` (45) and `abaya set` (40).
The published piece covers price. The demand next door is **cut and fabric**.

## 4. Abaya is sharply seasonal, and the season is Ramadan
5-year monthly index: Mar 2024 **14**, Mar 2025 **15**, Feb 2026 **14** / Mar 2026 13 —
against a 6-9 baseline the rest of the year. The peak tracks Ramadan (1 Mar 2025,
18 Feb 2026) and moves ~11 days earlier each year, so **Ramadan 2027 begins in early
February** and the buying ramp is **December-January**. Late August is the annual
trough. Nothing abaya-shaped should be timed for now; it should be built for December.

## 5. The geography is the surprise
Rising related queries carry country modifiers on BOTH head terms:
`modest fashion australia` **+300%**, `modest clothing uk` **+140%**,
`modest fashion france` +160%, `modest fashion uk` +100%,
`modest clothing canada` +80%, `modest clothing australia` +80%.

Trends geo (12m, excluding the St. Helena noise row):
- `modest dress` — **United Kingdom 100**, US 71, UAE 68, Australia 66
- `modest clothing` — Australia 66, **United Kingdom 66**, UAE 61, US 61
- `modest fashion` — **Netherlands 60**, UAE 50, Tunisia 46

Against our own Search Console, 28 days by country:

| country | imp | our position | brands in `data/brands.ts` |
|---|---|---|---|
| usa | 375 | 58.8 | ~19 |
| can | 47 | 50.5 | 6 |
| gbr | 47 | **36.2** | **~25** |
| bel | 21 | **13.0** | 3 |
| aus | 20 | 27.2 | 5 |
| nld | 18 | **11.6** | ~11 |
| deu | 12 | **5.8** | 3 |

We rank *far* better in the Low Countries and Germany (5.8-13.0) than in the US (58.8),
on a fraction of the impressions. The US is where the volume is and where we are
invisible; NL/BE/DE is where we are already visible and the volume is untapped.

## Revised recommendation
The order from the Search Console pass stands, with two changes:

1. **Where to actually buy hijabs, by price** — unchanged as #1, now confirmed on
   independent volume data. Widen the brief to answer the rising modifiers as well:
   jersey vs modal vs chiffon, and instant/slip-on styles. That is one piece, not two.
2. **NEW, and it may be better than #2 was: the British modest houses.** ~25 of the 113
   houses are UK. The UK is #1 or joint-#1 in Trends geo for both `modest dress` and
   `modest clothing`, `modest clothing uk` is rising +140% and `modest fashion uk`
   +100%, and it is the country outside the US where we already have the most
   impressions at the best position (47 imp, pos 36). Same data-backed format as the
   abaya piece. A Dutch/Belgian companion is the natural follow-up — smaller market,
   but positions 11-13 mean we would actually be seen.
3. **The co-ord set houses** — demoted to third. Best generic positions on the site
   (44) and ~52 impressions, but Trends puts `modest co ord` at an index of 6-11
   against `hijab store` at 24-69. It is a real topic, just a small one.
4. **Who actually makes modest activewear** — unchanged as a good piece, same small
   size as co-ords on Trends (5-11).
5. **Do not start an abaya follow-up now.** Build it for December, and make it about
   cut and fabric (open/closed, lace, floral, pashmina) rather than price, which the
   published piece already owns.

## Notes / follow-ups
- Trends indices are relative WITHIN a request, never across requests. Every comparison
  above is only valid against the other terms in its own table.
- The final week of any Trends window is partial and reads as a drop. The Aug 2026
  numbers above are depressed for that reason; do not read them as a decline.
- `St. Helena 100` appears at the top of two geo lists. Population ~4,500 — it is a
  small-denominator artefact, not a market. Ignore it.
