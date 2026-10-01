# Brand and category titles and meta descriptions, per Inoma Digital's October plan
**Date:** 2026-10-01 · **Status:** brand titles live on main (Tina approved 2026-10-01); category titles held on staging

## Goal
Inoma Digital's "SEO and Content Plan: October 2026" (28 Sep) asked, by 14 Oct, for:
1. Brand page titles and meta in the format "[Brand] Abayas: Prices, Sizing and Similar Brands"
   (brand pages carry 57% of impressions and few clicks).
2. Category titles and meta with target keywords for /modest-abayas, /modest-sets, /modest-hijabs.

## What changed
- `app/designers/[slug]/page.tsx`: the title is now `[Brand] [Top garment]: Prices from X & Similar Brands`
  (or `: Half Under X` when the floor is an outlier, the 2026-09-21 rule). It differs from the agency's
  wording in three places, and each is deliberate:
  - **The garment is the house's own top category**, not always "Abayas": MERRACHI, Diversity Modest and
    Hidayah lead with hijabs by count, and calling them "Abayas" would be false.
  - **"Sizing" is left out**: the page has no sizing information, so the title would promise something
    the page does not have.
  - **"& Similar Brands" appears only when the page links to some** (a region with other brand pages),
    and is the first thing dropped when the title would pass the 60 characters Google prints.
  The garment is also skipped when the brand name already contains it ("Rutba Fashion Abaya").
  The description now has "Compare similar brands from <region>." as its second sentence.
- `lib/seoCopy.ts`: new titles and descriptions for the three category pages, built around the queries each
  page already gets impressions for (Search Console, 1 Jul–30 Sep 2026):
  - /modest-abayas: "abaya", "abayas for women", "abaya online"
  - /modest-hijabs: "best hijab store online" (57 impr., position ~70), "buy hijabs (online)"; adds
    "cotton" because the October "Best Cotton Hijabs" article will link here (214 cotton hijabs are live)
  - /modest-sets: "modest co ord sets" (50 impr., ~48), "modest 2 piece set"
  Two drafted claims were removed after checking the catalogue: "abaya sets" (2 of 1,103 sets) and
  "3-piece sets" (9).

## Verification
- `npx tsc --noEmit` clean; `lib/seoCopy.test.ts` 5/5 (all titles ≤ 60, descriptions 50–160, unique).
- All 91 brand pages rendered through the real `generateMetadata`: titles 43–60 characters, descriptions
  115–160, "Similar Brands" in 86 descriptions.
- `eslint` on both changed files: clean.
- Full suite: 1326 passed, 1 failed — `lib/colourLeads.test.ts` (`lameera-moda:8791781867688` listed in
  `data/colour-leads.json` but not in the catalogue). That is a data test with nothing to do with this
  change; left for whoever owns colour leads.
- Staging check: see the session report.

## Notes / follow-ups
- Their 7 Oct request (analytics access for outbound clicks and UTM traffic) needs Tina to invite them in
  Pulse; it cannot be done from the code.
- Their canonical-tag request for `?type=` is already handled (valid subtypes self-canonicalise on purpose,
  everything else canonicalises to the lane). Tina is replying to them about it.

## Release decision, same day
Tina approved the **brand page** titles for production. The **category** titles (`lib/seoCopy.ts`) stay on
staging only: Inoma's week-1 work (1-7 Oct) produces a keyword map, and the category titles should follow it
rather than be changed twice. Tina is asking them for the target keywords for /modest-abayas, /modest-sets and
/modest-hijabs. Only `app/designers/[slug]/page.tsx` was applied to main, from a fresh `origin/main` worktree,
because staging also carries unreleased partner-with-us and Plausible work that was not part of this approval.
