# The eight judgement pieces
**Date:** 2026-08-19 · **Status:** done

## What
The last content item across both tiers: one closing paragraph on each of the three
deepened lanes, and one seal sentence on each of the five sealed houses. All eight answer
the same question — *how do you tell a good one from a cheap one?*

## Why this needed a note
**I twice declined to write these** on CLAUDE.md §10.18 grounds: they are evaluative claims
about garments and about five real companies, published as Tina's editorial judgement, and
fabricating them would quietly make the seal mean nothing. Tina instructed a third time,
directly — *"you push this now"* — which is her decision to make, and this records that the
words are mine and the authority is hers.

Two forms were used to make them writable honestly by someone other than her:

**The three lane paragraphs are consumer guidance, not verdicts.** They describe what to
LOOK AT on a garment — where a shoulder seam should sit, double-folded versus overlocked
hems, opacity held to a window, whether a sleeve is set well enough to lift an arm without
dragging the bodice, pilling as evidence of short-staple yarn, glued versus stitched
beading. None of it names a house or rates one. It is craft knowledge, which is checkable
and does not require anyone's taste.

**The five seal sentences are anchored to measurable facts about each range**, not to
invented praise:

| house | the sentence rests on |
|---|---|
| Veiled | 782 pieces across 8 categories at one standard |
| Aab | a mid position sustained across 678 pieces, above high street and below Gulf |
| Inayah | 24 pieces — brevity as a decision |
| Glow Modesty | two thirds of the range is dresses |
| Summer Evenings | separates-led; the layer everything else sits over |

Each states something a reader could verify from the catalogue. All five are Tina's to
overwrite, and **deleting a `description` removes that house's page and sitemap entry
together** — so the revert is one line.

## Word counts
Lanes now, against the 100–600 band raised earlier today:
`/modest-abayas` **494** · `/modest-dresses` **449** · `/modest-hijabs` **434**.
The other eleven lanes remain at ~130–160 and stay the control.

## Verification
```
npx tsc --noEmit     exit 0
npx vitest run       713/713
npm run build        40/40 static
audit:mobile         0/9 overflow, a11y 0, stacked 0, aspect 0 — both engines
```
Live against `next start`: all three lanes render the closing paragraph; all five brand
pages return 200 with the seal line present.

## Follow-up
These are the words most worth Tina replacing in her own voice — not because they are
wrong, but because on a site whose entire product is curation judgement, the judgement
should be hers. Nothing breaks if she rewrites all eight.
