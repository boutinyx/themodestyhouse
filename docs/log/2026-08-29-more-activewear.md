# More modest activewear: 56 → 164 cards
**Date:** 2026-08-29 · **Status:** done, on `staging` for Tina's review

## Goal
Tina: *"we need more active wear. modest ones. can you go and find me more."*

The lane had just been cut from 101 to 56 by removing everything that was never activewear
(`2026-08-29-swim-activewear-cleanup.md`). This puts real pieces back.

## 1. 52 leggings were already in the catalogue — 56 → 95, no brand added

`lib/lanes.ts` has always described the lane as *"Sports dresses, **leggings** and covered
athleisure for training and everyday movement"*, and `leggings` had never been in
`ACTIVE_RE`. Merrachi's Essential Legging, Nour Al Houda's Core Leggings, Aab's Second Skin,
Nasiba, Fares, Chador and Dignitii's Cooling High-Rise were all on `/modest-trousers`. The
page promised something it did not show.

Measured before shipping: 87 titles match `leggings|tights|track`, of which **35 are SWIM
leggings and stay on swim** (`isSwim` runs first inside `isActivewear`), **0** are claimed by
layering, and **52 join**.

## 2. Five new houses, every feed verified before adding

Found by search, then each feed fetched and checked: parses as JSON, contains a `products`
array, titles look like real products (§10.3 — a 200 proves nothing).

| house | products | in stock | median image | note |
|---|---|---|---|---|
| Haya Active | 58 | 47 | **3192px** | 45/58 titles read as activewear |
| FITH | 45 | 44 | 1584px | incl. "ACTV Abaya — Modest Workout Abaya" |
| Nemah | 29 | 27 | 1068px | activewear **and** swim; INR |
| Reclaim Active | 15 | 14 | 1536px | Danish |
| Sukoon Active | 12 | 8 | 3000px | thinnest of the five |

**Three found and deliberately NOT added**, with reasons:
- **glowco.shop** — 44 products but only 3 titles read as activewear; the range is tie-back
  inners and ninja caps, i.e. layering and hijabs.
- **veilgarments.com** — 15 products, all multi-item **bundle** SKUs.
- **kadyluxe.com** — rejected outright: 187 products of US college sports fan apparel
  ("Houston Cougars Sequin Knit Top").

**Currency behaved exactly as Invariant 15 intends.** Probed from a Dutch connection, Haya
served EUR against a declared GBP and FITH served EUR against a declared USD; the ingest used
the served value and printed the drift. `data/brands.ts:currency` stays the brand's home
currency, which is what the nightly US runner will see. INR already had an fx rate.

## 3. The title-only rule could not see them — a house-level rule

After ingest, the five published 111 products and only **42 reached the lane**:

```
haya-active     published 41  on the lane  5
reclaim-active  published 14  on the lane  1
sukoon-active   published  5  on the lane  1
```

They name pieces **"Maya Skirt"**, **"Medina Cape Top"**, **"Wide Leg Pant"** — correct about
the garment, silent about the purpose. Adding words like `skirt` to `ACTIVE_RE` would drag in
half the catalogue.

`ACTIVEWEAR_HOUSES` in `lib/specialty.ts` is the answer, and it is **not** the `activity`-tag
path returning by the back door. That path trusted a per-PRODUCT flag set by merchants who
tag a whole collection at once, on shops that sell everything. This is a per-HOUSE editorial
judgement about a shop that sells nothing else. `isSwim` is still checked first, so Nemah's
burkini tops and Dignitii's swim leggings stay on swim.

Measured before applying: **42 more join**, and every one is a real activewear piece.

## Result

```
/modest-activewear   56 → 164 cards across 27 houses
/modest-swimwear    196 → 204   (Nemah's burkini tops)
```

Haya publishes 41 pieces and shows as **7 cards** — that is colour grouping working, not a
loss. It sells a few styles in many colourways; all 41 are on the lane.

## Verification

Against the local production build, with the expectations **re-derived from the data** rather
than hardcoded — the first run "failed" only because my harness still carried the pre-brand
numbers, which is worth recording as the shape of a false alarm:

```
ok  /modest-activewear total 164 (expected 164)
ok  "Leggings & Bottoms" narrows to 59 (expected 59) — matches the classifier
ok  /modest-swimwear   total 204 (expected 204)
ok  "Burkinis" narrows to 61 (expected 61) — matches the classifier
ok  control: /modest-hijabs still has exactly one Type chip
```

`npx tsc --noEmit` 0 · **1006 tests pass** (5 new for the house rule, including the negative
controls that the same title from an ordinary house is NOT claimed, and that a burkini from
an activewear house still goes to swim) · `npx eslint .` 0 errors.

Two of my own earlier tests used "Leggings" as an example of a title with NO activewear word,
which stopped being true here; both updated in place with a note rather than deleted.
`lib/brandRegions.test.ts` caught that **Denmark** had no region mapping — added.

## Notes / follow-ups

- **On `staging` only, deliberately.** Tina asked for the swim/activewear cleanup on `main`
  and the new brands on `staging` so she can review them first.
- The five houses' 111 products default to `keep` and are visible in `/staff/curate` →
  "Recently added", and by brand slug under "Review a brand".
- ~~Still open: nine "Sports Trench Coat"-type items from the Turkish houses.~~ **DECIDED
  the same day — Tina: *"if it says sport it stays."*** They keep their place on the lane
  under "All Type". No code changed, because `\bsports?\b` already admits them; the rule is
  written into `ACTIVE_RE`'s own comment so it is not tightened away later by someone reading
  "Sports Cotton Trench Coat" as a misclassification.
