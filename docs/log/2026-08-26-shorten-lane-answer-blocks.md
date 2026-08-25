# The Hijabs and Abayas answer blocks, cut to house length
**Date:** 2026-08-26 · **Status:** done

## Goal
Tina, pasting the whole hijab block back: *"damn this text under hijabs is long
fix it"*, then *"check the rest too while youre on it"*.

## What was actually long
Measured all fourteen `lib/laneAnswers.ts` bodies before touching one, which is
what turned "the hijab one" into a two-item job rather than a guess:

| lane | words |
|---|---|
| modest-abayas | **494** |
| modest-hijabs | **434** |
| cardigans-sweaters | 197 |
| blazers-vests | 188 |
| jackets-coats | 185 |
| layering-basics | 158 |
| *the remaining eight* | 126–137 |

Median 137. **Two outliers at 3.2x and 3.6x the median; everything else already
sits in a tight 126–197 band.** So only those two were cut — the rest are
consistent with each other and did not need touching, which is worth saying
plainly since she asked me to check them.

## What changed
`lib/laneAnswers.ts` only. **Cut, not rewritten** — her sentences survive verbatim
where they survive, so the voice is unchanged (§10.18: this is her copy).

- **modest-hijabs 434 -> 178.** Dropped: square vs rectangular shape, instant/
  slip-on hijabs, size and the second neck pass, per-fabric care instructions,
  pilling, checking colour in daylight. Kept: the four-fabric guide (it is the
  literal answer to the h2), the jersey/modal line, the undercap dependency, and
  the hem test.
- **modest-abayas 494 -> 225.** Dropped: the colour-range sentence, regional
  cuts, care instructions, the bisht aside, the under-dress paragraph, the
  pricing comparison, the hem/sleeve-edge detail, the hold-it-to-a-window weight
  test, the embellishment note. Kept: the definition, open/closed and
  kimono/fitted cuts, sizing over the layer beneath, the four fabrics, the
  kaftan/jilbab/khimar distinction, and the shoulder-seam test.

**The keep/cut rule, since it will be needed again:** keep what answers the `h2`
and what is grounded in *this* catalogue (the recurring fabrics, the jersey/modal
observation) — that is the part a generic article could not write. Cut the
general-knowledge padding. One quality test a reader will act on beats four they
will not finish.

## Verification
- Re-measured all fourteen: range now **126–225**, median 137. Abayas is still
  the longest but at 1.6x the median rather than 3.6x.
- Rendered from a production build: `/modest-hijabs` serves its `h2` with a
  **178**-word body, `/modest-abayas` **225**. So the cut is what ships, not just
  what is in the source.
- `npx tsc --noEmit` **0 errors** in anything but a concurrent session's
  `components/DesignerDiscovery.tsx` (not staged here); lint clean;
  **791 tests pass**; build clean.

## Notes / follow-ups
- These blocks are the lane pages' GEO/AEO surface (`docs/log/2026-08-11-seo-geo-aeo-phase1.md`),
  so this removes indexable words — deliberately. The trade is that what remains
  is the catalogue-specific material, which is the part worth citing; length on
  its own was never the ranking asset.
- Four lanes sit at 185–197 (outerwear trio plus layering-basics). Above median,
  not outliers. Left alone.
