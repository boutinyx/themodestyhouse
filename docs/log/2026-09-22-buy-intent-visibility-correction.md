# Buy-intent visibility: corrected an earlier claim mid-conversation
**Date:** 2026-09-22 · **Status:** done (research/correction only, no code change)

## Goal
Tina asked whether the site is invisible to search/AI for "buy X" queries because
the site never literally says "buy." Investigate and give a grounded answer.

## What happened
First pass concluded "zero purchase-intent words anywhere in title tags or meta
descriptions, sitewide" — based on grepping `lib/lanes.ts` (the `title`/`intro`
fields, which are also the visible on-page copy) and `app/layout.tsx`'s root
default metadata. That claim was passed to Tina and to an independent second-
opinion subagent as established fact.

**It was wrong.** `lib/seoCopy.ts` is a separate, deliberate SEO-title/description
layer (added 2026-08-11, per that file's own header comment and
`docs/seo-geo-aeo-plan.md`), consumed by `app/[lane]/page.tsx`'s
`generateMetadata` (`seo?.title ?? lane.title`, `seo?.description ?? lane.intro`)
and by `app/page.tsx` (`pageMetadata('/')`). It already carries "Shop X online"
phrasing on essentially every lane and the homepage. Confirmed live on
production, not just in source:

```
/modest-dresses  <title>Modest Dresses Online — Long-Sleeve & Maxi Dresses</title>
                 description: "Shop modest dresses online: ..."
/modest-abayas   <title>Abayas Online — Shop Modest Abaya Dresses for Women</title>
/modest-hijabs   <title>Hijabs & Scarves Online — Shop Women's Hijab Fashion</title>
/                description: "Shop modest dresses, abayas, hijabs and more..."
```

Root cause: same shape as §10.38/§10.56 in CLAUDE.md — characterized site-wide
content from an incomplete search (two files) instead of checking what's
actually rendered. The fix that "should" have been the quick win was already
shipped six weeks ago.

## Why this matters more, not less
The independent second-opinion agent's diagnosis (domain authority + backlink
profile is the dominant gap, not copy) is now on firmer ground: the copy fix
was already live in production for six weeks and the underlying problem
Tina is reporting (site doesn't come up for "buy" searches) persists anyway.
That's a real data point, not a hypothesis.

## What's actually left, per the corrected picture
1. `SEO_COPY` coverage looks complete for all `LANES` category-kind routes and
   `/` — no further title/meta rewrite work identified.
2. Buying-guide editorial content (via the Ghost pipeline) — still the
   highest-leverage item, still needs Tina's voice/product opinions, not
   something to auto-generate.
3. Backlinks / off-site authority (e.g. reciprocal links from the 108 featured
   brands) — flagged by the second-opinion agent as the actual missing
   fundamental. Needs Tina's decision/relationships, not code.
4. Product-page schema + un-noindexing — still gated behind adding real
   unique content per product first (per both the original 2026-08-05 thin-
   content revert and the second opinion's explicit ordering).

## Notes / follow-ups
No code changed. This entry exists so a future session (or agent) doesn't
re-derive "the site never says buy" from the same incomplete grep.
