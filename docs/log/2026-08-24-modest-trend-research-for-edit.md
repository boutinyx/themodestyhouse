# Trend research for a new editorial "edit"
**Date:** 2026-08-24 · **Status:** done (research phase — no page built yet)

## Goal
Tina, with a screenshot of aabcollection.com's "The Art Of Summer / HIGH SUMMER 2026"
hero: *"i want an edit like this but then for what the modest girlies wear and is trendy
i want you to go and analyse google trends or anythin to see what they search up so we
can make an edit"*.

So: find what modest-fashion shoppers are actually searching for RIGHT NOW, from real
data, and only then propose the edit.

## Sources actually used (and what each one can and cannot say)

| Source | What it gives | Limit |
|---|---|---|
| Google Trends (unofficial API) | **Rising** related queries, US + GB, 12 months | Relative growth, no absolute volume |
| Google Suggest (autocomplete) | 9,287 ranked suggestions over 28 seeds x a–z x 2 geos | Popularity ORDER, not growth |
| Search Console (`sc-domain:themodestyhouse.com`) | Her own 90-day queries | Site is new — 100 queries, 1 click, mostly position 40–90 |
| `data/products.json` | 20,081 live products, 108 brands | Supply, not demand |
| Published AW26 trend reporting | Editorial corroboration | Marketing copy — treated as a cross-check only |

Google Trends first returned **429**; it worked after a cookie warm-up against
`trends.google.com/trends/explore` with a real UA, plus retry/backoff. Worth knowing for
next time — the endpoint is usable, it just refuses a cold request.

## What the data actually says

### 1. The dominant rising theme is FABRIC, not silhouette
Every seed's rising list is led by a material word. US + GB, 12 months:

```
pashmina abaya        +1,400%      chantilly lace hijab    Breakout (GB)
premium chiffon hijab +1,300%      liquid jersey hijab       +950% (GB)
white jilbab            +750%      lace hijab          +600% GB / +400% US
lace abaya              +350%      bamboo jersey hijab       +300%
floral abaya            +250%      premium jersey hijab      +250%
embroidered abaya       +200%      chiffon khimar            +200%
satin co ord set        +180%      velvet abaya              +170%
winter abaya            +160%      knit / cotton / linen co-ord  +70–80%
```

### 2. The matching SET is rising on its own, everywhere
`jilbab set +950%` · `abaya set +250%` · `modest co ord set +120%` ·
`khimar and abaya set +80%` · `khimar set +60%` · `satin co ord set +180%`.
Published AW26 reporting independently describes "open-front abayas worn over matching
dresses" as the season's silhouette.

### 3. Colour: earthy, corroborated on both sides
Trends: `brown co ord +60–80%`, `black modest dress +70%`, `yellow abaya +170%`,
`white khimar +200%`. Reporting: sandalwood, amber, burnt sienna, warm taupe.

### 4. Her own GSC agrees on one thing specifically
Thin data, but the co-ord cluster is the one that already surfaces:
`modest blouses` (13 impr), `modest dress clothes` (8), `modest coords` (4),
`modest co ord set` (3), `modest co ords for women` (3), `modest boutique dresses` (5).
An edit about sets would be pointed at a query she already appears for.

### 5. The catalogue can deliver it — this was the make-or-break check
Live products matching each rising theme, by title:

```
Sets / co-ord   1,959 pieces / 75 brands       Chiffon   993 / 43
Jersey          1,612 / 49                     Satin     746 / 61
Knit & wool       680 / 44                     Lace      434 / 51
Linen             486 / 55                     Embroidered 403 / 32
Floral            402 / 43                     Velvet     85 / 25
taupe/sand/camel 1,406 / 76                    brown/mocha 1,312 / 79
open-front abaya   696 / 25                    pleated    473 / 46
```

## One signal I threw away, and why

My first pass reported "new in last 90 days" per theme — 495 new satin pieces, 247 new
lace — as evidence that brands are pushing these categories. **That was wrong and I did
not ship it.** `firstSeen` is the date WE first scraped a row, not the date the brand
launched it. It spans only 2026-08-05 → 2026-08-19 (lifecycle tracking started this
month), and **9,330 of the 14,225 dated rows land on a single day**, 2026-08-10, a bulk
re-scrape. The 90-day and 180-day counts were identical, which is what gave it away.

There is currently **no supply-side "new arrivals" signal** in this data, and there won't
be a real one until `firstSeen` has months of history behind it. Anyone reaching for it
before then is measuring our scrape schedule.

Related: the theme counts above are regex-over-title, so they are a sizing estimate, not
a curated set. Spot-checking found real false positives — Yasmin Jay's "Velvet Cap Grip"
(an AUD11 undercap grip) sits inside the velvet 85, and a "Leather Cap with Embroidery
Detail" inside embroidered. A published edit needs hand-picked pieces, not the regex.

## Where this stops
Three concepts were put to Tina rather than chosen for her — the evidence narrows it to
texture / sets / palette, but which one becomes the edit is a taste call, and §10.18 is
explicit that her site's voice is hers. Nothing has been built.

---

## Follow-up: is the demand European / Dutch? (same day)

Tina: *"are they searching up like europe or dutch girl items. i know a lot of the girlies
that have modest brands are populr in the space. i thought about ahveing an edit like 'a
dutch girls diary'"*.

Re-ran Google Trends against `geo=NL`, in Dutch and English. **Her instinct is correct,
and the Dutch data is a different story from the US/UK data — not a translation of it.**

### 1. NL search is BRAND-led, not category-led
Top related query in the Netherlands:

| seed | #1 related query |
|---|---|
| `hoofddoek` | **merrachi hoofddoek** (100) |
| `modest fashion` | **noureen modest fashion** (100) |
| `abaya` | `abaya dames` (100), **merrachi** 3rd (47) |
| `hijab` | `instant hijab` (100), **merrachi / merrachi hijab** (37) |

Dutch shoppers search a HOUSE by name. Both houses are already in the directory —
MERRACHI (Amsterdam, 878 pieces) and NOUREEN (Antwerp, 186).

### 2. NL rising themes diverge sharply from US/UK
```
NL                                      US/UK (for contrast)
hijab swimwear      +700%               pashmina abaya     +1,400%
sports hijab        +450%               premium chiffon    +1,300%
lace abaya          +350%  (shared)     liquid jersey (GB)   +950%
bamboo hijab        +170%               lace hijab (GB)      +600%
liquid jersey       +130%
instant hijab       +110%
bruine jurk         +190%
sport abaya      Breakout
```
Active/swim and the instant hijab are effectively an NL story; they do not appear in the
US/UK rising lists at all.

### 3. The finding that makes the edit
`liquid jersey hijab` is **+950% in the UK**. Who actually sells it, from the catalogue:
**81 pieces / 13 houses — and the top three are Losyana (Nijmegen, 27), MERRACHI
(Amsterdam, 17), NOUREEN (Antwerp, 9).** The fabric Britain is discovering is Dutch.
MERRACHI is itself rising in GB search (+250%, `merrachi hijab` +300%).

### 4. Catalogue can answer all of it
13 Dutch/Flemish houses, **2,341 pieces**, all EUR. NL themes vs stock: instant 124/15 ·
sports 99/16 · swim 268/22 · bamboo 390/26 · jersey 1,612/49 · brown 1,206/79.

### Noise excluded
`hoofddoek` rising is heavily polluted by non-fashion Dutch news and crossword traffic —
`k3 hoofddoek`, `esmee ipema hoofddoek`, `hoofddoek puzzel`, `hoofddoek 6 letters`. None
of it is used. Same treatment as the political spikes dropped from the US/UK hijab list
(`ilhan omar`, `aoc hijab`, `austrian president hijab`).

### Also worth recording
`widgetdata/comparisongeo` (interest-by-region) failed repeatedly under rate limiting, so
"where does NL rank globally" is **unanswered**. The brand-led finding above came from
related queries instead, which is stronger evidence anyway. Do not report a global ranking
without getting that endpoint to actually return.

### Outcome
Supersedes the texture concept Tina picked earlier the same day. Draft written to
`docs/drafts/2026-08-24-a-dutch-girls-diary-DRAFT.md` (765 words), her title.

---

## Second follow-up: the Dutch hijabi LOOK, not Dutch brands (same day)

Tina: *"no i mean the style of the dutch hijabi i think a lot of people are looking for
that particial style etc"*. The first Dutch pass answered the wrong question — it was
about which houses are Dutch, not about the aesthetic.

### The uncomfortable finding, first
**As a Google search term, the Dutch hijabi look does not exist.** Head-to-head relative
volume, worldwide, 12 months (shared 0–100 scale, one Trends comparison):

```
european hijab      37.9      <- but see caveat
hijab outfit ideas  26.1
modest outfit ideas 23.9
minimalist hijab     4.3
old money hijab      0.4
clean girl hijab     0.1
dutch hijabi         0.0      (1.5 in NL, and flat)
```

Autocomplete DOES return `dutch hijabi influencer`, `dutch hijab style`, `the dutch
hijabi`, `modest dutch hijabi` — 12 distinct style-relevant variants — so the phrase is
real. It is just tiny. For comparison the same harvest returned **54** distinct `old
money hijab` variants, several in Malay/Indonesian (`gaya old money hijab`, `inspirasi
outfit old money hijab`) and French (`old money style femme hijab`).

**`european hijab` is NOT usable as evidence.** It is the biggest number in that table and
I could not confirm it is fashion at all — its related-queries widget returned nothing,
and the autocomplete around it is `european hijab ban`, `european women hijab`, `european
wearing hijab`, which reads as news and curiosity, not shopping. Reported to Tina as
unusable rather than as a 37.9.

**Pinterest, where aesthetic search actually lives, could not be measured.** Both
`trends.pinterest.com/api/v1/trends/keyword/US/` and the BaseSearchResource endpoint
return 404 / gzipped nothing without auth. Tried twice, stopped there. So there is
currently **no evidence either way** on the visual-search side, and none was claimed.

Conclusion given to Tina: nobody Googles an aesthetic by name — they Google garments
(which the first pass already sized) and browse looks on Pinterest/TikTok. So the Dutch
frame is a hook, not an SEO play; the SEO value sits in the garment words inside it.

### What DID work: deriving the look from supply
Instead of asking what people search, ask what the Dutch houses actually make. 2,341
pieces from 13 NL/BE houses vs the other 17,740, share-of-catalogue by title:

```
jersey            27.6%  vs  5.4%     x5.1 MORE   <- the foundation
oversized          2.0%  vs  0.7%     x2.6 MORE
swim               2.6%  vs  1.2%     x2.2 MORE
satin              6.5%  vs  3.3%     x1.9 MORE
instant hijab      1.0%  vs  0.6%     x1.8 MORE
brown/mocha/camel 10.4%  vs  6.7%     x1.6 MORE
grey               4.7%  vs  3.0%     x1.6 MORE
olive/sage         5.0%  vs  3.6%     x1.4 MORE
cream/taupe       12.0%  vs  9.1%     x1.3 MORE

tunic              0.5%  vs  3.4%     x7.3 LESS
embroidered        0.5%  vs  2.2%     x4.7 LESS
kimono/open front  1.2%  vs  4.8%     x4.2 LESS
lace               0.8%  vs  2.5%     x3.1 LESS
black              8.3%  vs 11.3%     x1.4 LESS

garment mix  NL: hijab 37% dress 15% abaya 14% top 11% trousers 9% skirt 7%
            rest: abaya 28% hijab 24% top 17% dress 15% trousers 8% skirt 6%
```

That is a measurable aesthetic and it is mostly SUBTRACTION: undecorated jersey
separates, oversized, warm neutrals, scarf-led rather than abaya-led, less black than
anyone else in the directory.

This is the method worth reusing: when demand data can't describe a look, **supply data
can** — what a coherent group of houses chooses to make, indexed against everyone else,
is a definition nobody had to invent.

### Draft
`docs/drafts/2026-08-24-a-dutch-girls-diary-DRAFT.md` rewritten (772 words) around the
five differences. Her title kept. The swim x2.2 finding is left in the piece explicitly
marked as unexplained rather than given a story (§10.18).

---

## Decision (same day)

Tina picked two, and is writing into both herself:
1. **A Dutch Girl's Diary** — kept, leaned harder into jersey at her direction ("the jersey
   fabric edit or something").
2. **Everyday Lace** — new, replacing the broad "Fabric Year" concept. The generic fabric
   draft was deleted; its trend table survives as the closing section of the lace piece.

Both drafts now carry `> **YOUR BIT**` slots — a marked place plus a specific question, so
the research and her voice stay separable. Four slots in Dutch, four in Lace.

### "Everyday lace" was verified before building on it
Her angle is that lace is everyday, not occasionwear. The catalogue agrees, decisively:

```
lace pieces, in stock            434  / 51 houses
occasion language (gown|evening|bridal|wedding|gala|formal|prom)
                                  14  = 3.2%
trim/detail language (trim|detail|panel|edge|cuff|accent)
                                 120  = 27.6%      <- 8.6x more
garment mix   abaya 159 (37%)  dress 94 (22%)  top 73 (17%)
              hijab 44 (10%)  skirt 38 (9%)  trousers 14 (3%)
median price  USD 72.90 · GBP 83 · EUR 65     cheapest USD 4.90
lace hijabs   44 across 11 houses
```

Abayas + hijabs are ~47% of all lace — the two throw-on garments — and the cheapest lace
hijab is $6.90. This is not a fabric being saved for best.

The nice tension, which is the piece's hook: **search treats lace as occasionwear (peaks
Feb–Apr with Ramadan/Eid, 5-year data) while the brands treat it as trim.** Publishing
"everyday lace" in August is therefore counter-seasonal on purpose, not by accident.

### Corrections made to earlier advice in this session, all after measurement
1. **"Fabric is what everyone searches" was wrong** — that was *growth*, not volume. On one
   shared scale: `hijab` 88.8, `abaya` 19.9, `modest dress` 3.8, `jersey hijab` 1.0,
   `chiffon hijab` 0.6, `satin abaya` 0.2, **`lace abaya` 0.04**. Lace is ~500x smaller
   than plain `abaya`. "Breakout" means from near-zero and lace is still near-zero.
2. **`modest fashion` — the phrase the site is organised around — is 1–3 in every market.**
   `hijab` and `abaya` are ~85–90% of demand. But `hijab`'s related queries are
   overwhelmingly definitional (*what is hijab*, *hijab meaning*, *iran hijab*), so its
   volume is mostly non-commercial.
3. **The "traffic edit" recommendation was wrong twice and fixed by checking the SERP.**
   `modest dress` returns Wikipedia + retailer collection pages — no article can win it,
   and the `/modest-dresses` LANE is the right target instead. `best modest fashion brands`
   returns nothing but listicles, mostly low-authority brand blogs, and every brand on that
   page is American-Christian modest — the global hijabi market is absent, and the one
   hijab brand listed (Culture Hijab) is already in this directory. That is the winnable
   query. Not commissioned yet; recorded here so it is not re-derived.

### Method worth keeping
Every "when should this publish" answer came from 5-year monthly seasonality, not instinct:
`jersey hijab` peaks **Aug** · `lace abaya` peaks **Mar** (Sep is its annual floor) ·
`velvet abaya` peaks **Dec** (9x August) · `winter abaya` peaks **Nov** ·
`modest dress` peaks **Apr**.
