# Cleaning up /modest-activewear and /modest-swimwear
**Date:** 2026-08-29 · **Status:** done

## Goal
Tina: *"the modest active wear swimwear is all messed up sometimes they do only a weird name
and now it looks like shit the type filter is also not good and need to be fixed up
differnt filters cleaned up calalogus."*

Four separate defects turned out to sit behind that, and the biggest was not the one the
report named.

## 1. The activewear lane was 65% not activewear

`isActivewear()` qualified an item on the feed's own `activity` tag alone, if its garment
was one of `trousers | top | set`. Measured:

```
/modest-activewear — 101 items
  matched because the TITLE says so       : 35
  matched ONLY by the feed's activity tag : 66
```

The 66 included Niswa's **Audrey Blazer**, **Dakota Belted Wrap Coat** and **Zara Trouser**,
nine Aeon Abaya trousers (*Jordan Pants*, *Ryder Pants*, *Skye Pants*…), six Ria Miranda
jackets and tees, Yasmin Jay's **Dune Splash Blouse**, and Veiled's **Safina Wrap Sarong**.
A merchant tagging a whole collection `gym` is not evidence about any one garment, and
`ACTIVE_GARMENTS` is broad enough to cover most of a wardrobe.

**Fix:** the title is now the only evidence. Nothing is deleted — an item that stops being
activewear returns to the lane its garment already puts it on, which for all 51 dropped is
where it belonged. The vocabulary was widened at the same time, because it had `activewear`
but not bare **`active`**, and no `performance` / `track pants` / `on-the-go` — so genuinely
athletic pieces could ONLY arrive by the noisy path. That widening pulls in 47 real items
that were stranded on other lanes, mostly Dignitii's sports dresses and BreathLite sports
hijabs in the colourways the tag happened not to carry.

**Result: 101 → 56, and the 56 read as activewear.**

## 2. Seven bikinis and a hand cream on the modest swim lane

`BAQA` published six (*Gathered Bikini Set*, *Bamo Bikini*, *Two Color Bikini Set*…) and
Lanuuk one. On a modest-fashion directory that is an editorial violation, not a
mis-classification. `\bbikinis?\b` now sits in `data/exclusions.json.patterns` — the
permanent-removal mechanism per Invariant 3. Measured before adding: 8 published hits, all
genuine bikinis.

Chador's **"Silk Smooth Hand Cream"** was on the swim lane too — its garment had been tagged
`swim` and nothing vetoed it first. Added to `lib/nonApparel.ts`, anchored to the BODY PART:

```
/\b(hand|body|face|foot|skin)\s*(creams?|lotions?|balms?|scrubs?|washes?|oils?)\b|…/i
```

A bare `/\bcream\b/` is §10.10 in its purest form — measured against the live catalogue it
matches **205 PUBLISHED products**, because cream is a colour: *Cream Closed Abayah*,
*Butter Cream Jersey Hijab*, *Isla (Cream)*. The phrase-anchored version matches exactly one
row, which is the one that is actually a hand cream. Both directions are now tests.

## 3. The "weird names" were untranslated Dutch

Noureen's **"Zwem Ninja Black"**, **"Zwemturban Berry"** — *zwem* is Dutch for swim. The
brand was missing from `data/translate-brands.json`, so `build-data.mjs` never looked its
titles up. Added (`"noureen": "nl"`) and the cache populated: 6 entries, now publishing as
"Swim Ninja" / "Swimming turban".

The other half of "only a weird name" is the merchant's own titling — Losyana lists three
products all called **"Luna Marina"** with the colour only in the URL. That is not ours to
invent, and the colour-variant grouping added on 2026-08-28 already collapses runs like it
to a single card.

## 4. The Type filter — the part she named

On the live site that day, `/modest-activewear`'s Type dropdown offered exactly:

```
ALL TYPE · CAPS & UNDERSCARVES · INSTANT HIJABS · SPORT HIJABS
```

Those are hijab **fabric** options. They appeared because 15 of the lane's items are sports
hijabs, so `cat.hijabTypeFilters` was non-empty and that dropdown rendered. On a lane of
leggings, sports dresses and co-ords, the only way to filter was by three kinds of headwear.
`/modest-swimwear` had **no Type control at all**.

Both lanes now have their own, built on the same columnar pattern as the layering / outerwear
/ hijab / dress ones (`lib/specialty.ts` classifier + labels → a column in
`lib/compactCatalogue.ts` → a dropdown in `components/FilterableGrid.tsx`):

| /modest-swimwear | | /modest-activewear | |
|---|---|---|---|
| Burkinis | 60 | Sports Hijabs | 15 |
| Swim Dresses | 30 | Sets & Co-ords | 14 |
| Swim Hijabs & Caps | 29 | Tops & Jackets | 11 |
| Swim Leggings & Pants | 26 | Leggings & Bottoms | 5 |
| Swim Tops & Suits | 26 | Sports Dresses | 2 |
| Cover-Ups | 5 | | |
| *(no type)* | 17 | *(no type)* | 9 |

The unclassified stay visible under "All Type" — a "Paddle Suit", or the Turkish houses'
"Sports Cotton Trench Coat", belongs to no bucket and inventing one would be worse.

**Ownership is declared, never inferred.** A swim cap is `isSwim` AND appears on
`/modest-hijabs`, so that lane's encoded catalogue carries a populated `swimSubtypes` column
it does not own — and the first cut of this rendered **two Type chips on /modest-hijabs**,
the second offering "Swim Hijabs & Caps". `lib/laneSubtypes.ts::domainForLane()` now states
which lane owns which domain and the lane page passes it in.

## Verification

Three mistakes of my own, all caught before shipping, all worth recording:

1. **My Python edit script ate every `\b`.** A non-raw string turned `\b` into a literal
   BACKSPACE (0x08) — 11 lines of `lib/specialty.ts` shipped word-boundary-less regexes,
   which is §10.5 and §10.10 exactly, self-inflicted. Found by `grep -c $'\x08'`, the whole
   block reverted, and re-added from a raw string. Verified 0 backspaces remain.
2. **Two existing tests asserted the old tag behaviour** and failed. They were rewritten
   rather than deleted, because the behaviour they pin is the one that was wrong and could
   return.
3. **The new dropdowns listed the right options and filtered to ZERO.** `typeIdx` resolved
   correctly but the row-filter loop had no `swim`/`active` branch, so it read the wrong
   column. This is the §10.28 trap in full — the control looked perfect and returned nothing
   — and it was caught only because the check asserts the RESULTING COUNT against the
   classifier, not merely that the menu opened:

```
/modest-swimwear:   all=193 -> "Burkinis"=60      (classifier said 60)
/modest-activewear: all=56  -> "Sports Hijabs"=15 (classifier said 15)
```

Plus a control lane in the same run: `/modest-hijabs` keeps exactly one Type chip with its
own 15 options, none of them swim.

`npx tsc --noEmit` 0 · `npx eslint .` 0 errors · **1002 tests pass** (17 new across
`specialty.test.ts` and `nonApparel.test.ts`, including the negative controls that cream-the-
colour survives and that a gym-tagged blazer does not) · `audit:interaction` **0 problems**
across 5 viewports × 2 engines.

## Notes / follow-ups

- **The "Sports Trench Coat" class is still on the activewear lane** — nine items, mostly
  Turkish houses using "sports" to mean sporty styling: *Oversize Sports Cotton Trench Coat
  with Epaulette Detail*, *Ribbed Sports Abaya 3163*, *Women's Sports Trench*. They match
  `\bsports?\b` honestly, so the classifier is not wrong; whether they belong on the lane is
  an editorial call for Tina. They currently sit under "All Type".
- `Ribbed Sports Abaya 3163` and `Sports Stitched Abaya 9200` carry the merchant's SKU in
  the title. Cosmetic, brand-side, not fixable from here without inventing a title.
- Swim "Set" items (*Mira Swim Set*, *Taali Swim Set*) are deliberately unbucketed: a swim
  set could be a burkini or a two-piece and guessing would be wrong.
