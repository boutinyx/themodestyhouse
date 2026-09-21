# Brand-page SEO, second look — Diversity Modest dropped out; nothing shipped
**Date:** 2026-09-21 · **Status:** analysis — nothing shipped

## Goal
Tina, after Merrachi reached page one: do the same for the other brands, especially Diversity Modest.

## What was already true
The 2026-08-31 change (`9a890cf`) was template-wide, so all 89 brand pages already have it. There is
no "Merrachi-only" work to copy across.

## Findings (Search Console 2026-08-24 to 2026-09-20, plus live results checked in Chrome)

- **Demand is bare brand name.** Of ~7,000 brand-page impressions in 90 days, 4,855 are the bare
  name. The rest are misspellings and "clothing / store / shop / fashion / amsterdam / uk".
- **Diversity Modest is not a success story, it is a drop.** Its 28-day total (11 clicks, 507
  impressions, pos 6.2) is all from 2026-08-24 to 09-03. Daily impressions: 160 (09-01), 96, 56, 2,
  then 0-2 a day since 09-04. Google last crawled it 2026-09-03 (indexed, canonical correct, no
  errors) and has not been back in 18 days.
- **Merrachi is the opposite:** 80-100 a day early Sept, 552 on 09-19, average position ~7.
  Bayt El Hayat shows our page at #3 on google.nl with the new title, so the new title format is
  not disqualifying by itself.
- **Live results for "diversity modest"** (google.nl and google.com/US): the brand's own site, its
  Instagram (81K), TikTok and Instagram posts. Our page is absent from both. `site:` shows Google
  holds the page with the OLD content ("42 pieces", €21-€142.96); the live page says 61 pieces.
- **Jawda, Emlavish:** own site + Instagram + Trustpilot/Companies House above us; not winnable on
  the bare name.

## Not established
Why Diversity Modest fell out. Likeliest: SERP crowding by social results, plus the early boost a
freshly recrawled page gets fading. Not proven; no experiment was run.

## Not done, deliberately
No title/description/body change. The one page that moved is one where the cause is unknown, and
changing the template would also touch Merrachi, which is working (§1: research before implementing).

## Follow-ups
- Re-request indexing for /designers/diversity-modest (stale 42-piece copy).
- Re-check its daily impressions in ~2 weeks.

## Addendum — Tina asked to revisit how Merrachi was done, and to look at layout, keywords and the agency audit

**The Merrachi tactic did not create page one.** `docs/log/2026-08-31-brand-page-search-fix.md` says
so itself: position 6.5 was measured on 08-26, before the 08-31 change. Since then:
```
merrachi 09-07..09-20   "merrachi"  2,308 impressions, 3 clicks, pos 6.9   (0.13% CTR)
```
Its growth is demand for the brand name. The change was template-wide, so Diversity Modest had it
the whole time it fell from 160/day to 0. The same tactic cannot explain both.

**What earned clicks on a brand page:** modifier queries where we rank ~5.5 ("diversity modest
clothing": 11 impressions, 2 clicks). Volume is tiny.

**Layout/keywords on lane pages:** `/modest-skirts` and `/modest-sets` already have a matching title,
H1, ~1,150 words, 24 cards. Live page one (google.com, 2026-09-21):
- "modest skirts", "modest co ord set": brands' own collection pages (Veiled, Aab, Fares, Hawaa are
  ours), Instagram, Amazon, Pinterest. No directory.
- "modest fashion brands uk": brand stores again (Aab, Hawaa, Sabirah, Modora...).
Non-brand: 3,216 impressions, 13 clicks in 90 days, positions 40-70. The gap is authority, not markup.

**Agency audit** (Inoma Digital, 2026-09-11) is already reviewed in `2026-09-15-inoma-audit-checklist.md`
and `2026-09-15-inoma-content-plan-review.md`: technical 94%, no layout findings; its growth phase is
content and link-building.

**Real lever left:** links from the brands that already outrank us on these terms. No outreach has ever
been sent (content-plan review, corrections table).
