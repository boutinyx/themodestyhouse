# The downtrend is a spike decaying, and 12 pages Google looked at and refused
**Date:** 2026-09-08 · **Status:** analysis — nothing shipped, two decisions open

## Goal
Tina: *"we are in a downtrend while we were growing the past couple of weeks after we
updated the designers page, so I'm really curious why"* and *"go look at the non-indexed
pages"*.

## The downtrend is real as a slope and misleading as a story

```
09-01   990 impressions   ← peak
09-02   861
09-03   571
09-04   421
09-05   417
09-06   336               ← 66% below peak
```

That is a real fall. But the level it fell FROM was six days old:

```
pre-change   08-16..08-25    72 impressions/day · 0.4 clicks/day
ramp+peak    08-27..09-01   765 impressions/day · 5.7 clicks/day
now          09-04..09-06   391 impressions/day · 3.0 clicks/day
```

**Still 5.4× the impressions and 7.5× the clicks of two weeks ago.** Average position over
the same period went 14.1 → 17.8, essentially flat. Nothing collapsed; a spike is settling.

## It was not the designers content update

The timing looks damning and is not. Two separate changes:

```
08-26 02:07  6e569a9  fix(seo): link every brand page from /designers — 86 were orphaned
08-31 22:28  9a890cf  seo(designers): give the brand pages something to say
```

Impressions began climbing on **08-27** — the day after the ORPHAN-LINK fix, and four days
before the content update. By the time the content update shipped the site was already at
899/day. It shipped into the top of the curve, which is why it looks like the cause.

The pages that lost the most confirm it. `/designers/jawda`, `alia-anggun`, `whiteicy`,
`lafemme`, `kamin`, `manzaram`, `elaa-the-label`, `klay` all existed in Search Console from
**2026-08-07** and earned **zero impressions every single day until 08-27**. They were
indexed and invisible. The orphan-link fix made 86 of them reachable, Google re-evaluated
them, showed them broadly for about a week, and then settled.

## They were NOT deindexed — this was checked, not assumed

The obvious hypothesis was that the pages fell out of the index. Every one of the eleven
biggest losers was inspected live:

```
jawda · abayabuth · alia-anggun · whiteicy · lafemme · elaa-the-label
kamin · manzaram · diversity-modest · klay · hawaa
   → all PASS, "Submitted and indexed"
controls (emlavish, merrachi, by-hasanat) → same
```

They are indexed and ranking at positions 5–10. They simply received no impressions,
which means **nobody searched those brand names in those three days**. `jawda modest` went
251 → 0. That is not how durable demand behaves; it is how a Google discovery test ends.

This is the same finding as `docs/log/2026-09-03-what-the-impressions-are-actually-worth.md`
seen from the other side: brand-name impressions were 76% of the total, they convert at
roughly zero, and they are volatile. The impression curve was never the thing to watch.

## The non-indexed pages: 12 of 159, and all of them are mine

Full sitemap inspected, one URL at a time:

```
147  Submitted and indexed
  5  URL is unknown to Google          ← never crawled
  3  Discovered - currently not indexed ← known, not crawled
  4  Crawled - currently not indexed    ← crawled and REFUSED
```

Every one of the twelve is a `?type=` subtype page shipped on 2026-09-02. Four of my
sixteen made it in (`/modest-dresses?type=everyday`, `/modest-skirts?type=maxi`,
`?type=pleated`, `/modest-sets?type=two-piece`).

**The four that were crawled and refused are all `/modest-tops?type=*`** — and the reason is
measurable:

```
/modest-tops              1,160 words of visible text
  ?type=shirt      987 words · 86.3% word overlap with the parent
  ?type=tunic      975 words · 81.8%
  ?type=blouse   1,009 words · 84.5%
  ?type=tshirt     978 words · 85.4%

for contrast: /modest-tops vs /modest-abayas — 49.6% overlap
```

Google is right. Every subtype page repeats the parent lane's intro AND its ~350-word
`laneAnswers` block; the only genuinely new text is the `h1`. A page whose unique content
is one heading is a duplicate, and `lib/laneAnswers.ts`'s own header already names this
risk: *"12 near-identical category-page templates with only the garment name swapped is the
textbook thin/scaled content pattern Google's policy targets."* I built sixteen more of
exactly that and did not check.

The other eight have simply never been crawled. Six days old, in the sitemap, one internal
link each from the "Also browse" row added 2026-09-02. That is a crawl-budget wait, not a
defect.

## Two decisions, both Tina's

1. **Per-subtype copy.** ~16 short factual blocks — what a tunic is versus a blouse — so
   each page says something the parent does not. It is the only thing that makes these
   pages work, and it is the same class of writing as `lib/laneAnswers.ts` (generic garment
   knowledge, not brand voice), so it can be drafted for her to approve.
2. **Or pull the thin ones from the sitemap.** `TOO_THIN_FOR_SITEMAP` in
   `lib/laneSubtypes.ts` already exists for exactly this. They stay linked and filterable;
   we simply stop asking Google to index near-duplicates.

## Everything else checked and healthy
- `npm run audit:storefronts`: **115 brands, every storefront reachable.** The 718 dead
  links of 2026-09-03 are gone — nour-al-houda's domain came back, madiha and aniqq were cut.
- No `X-Robots-Tag`, no meta robots, robots.txt allows everything but `/admin` and `/api`.
- Sitemap serves 159 URLs.
