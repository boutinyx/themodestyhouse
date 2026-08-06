# Add five brands selected on photography quality (Cult Abaya, Kamin, CHI-KA, Latifi, Bouguessa)

**Date:** 2026-08-06 · **Status:** done

## Goal

Tina's brief, verbatim: *"pictures should be good quality. i dont want old women dresses. it
should look trendy (old women dresses are a lot of the time floral). maybe reddit is a good
place to start."*

This inverts the previous brand hunts. Those optimised for "recognisable brand with a working
feed"; here **image quality and trend-forward silhouette were the primary filters**, and feed
availability was only a gate.

## Method

A 7-agent `Workflow`: three hunters (Reddit, fashion press, social/creator) → three measurers
→ shortlist. The measurers were required to do something the earlier hunts never did:
**download sample product images and actually look at them** with the Read tool before rating
a brand. Titles and marketing copy are not evidence of photography quality.

Objective metrics captured per brand from the live feed: median image width, % of products
whose first image is portrait (model-shot proxy), and % of titles matching floral/ditsy/
paisley terms.

I then re-verified the finalists myself rather than relaying agent claims — refetched each
feed and viewed hero images for Kamin, CHI-KA and Bouguessa by eye.

## What was added

| Brand | Items | Currency | Median px | Note |
|---|--:|---|--:|---|
| CHI-KA | 655 | AED | 1667 | Most consistent art direction; muted kaftans/abayas |
| Bouguessa | 225 | USD | 2048 | Quiet luxury RTW; needs per-product curation |
| Kamin | 99 | AED | 2213 | Contemporary tailoring, clean studio |
| Cult Abaya | 55 | AED | 3394 | Campaign photography, 0% floral |
| Latifi | 21 | AED | 2438 | Set-designed occasionwear, small catalogue |

**1,055 new items.** Catalogue 7,7xx → **8,809** across **46 brands**.

## What the method caught that a description-based hunt would not

Three candidates with *good-looking metrics* were rejected only because someone looked:

- **Mei** — 3000×4000 images, 100% portrait. They were **iPhone photos**: a living-room
  snapshot against a curtain, an abaya against a scratched lift door, and one image that was
  just nine dresses on a garment rack.
- **FIZIWOO** — 100% model shots, 0% floral. The 0% was an artifact of Malay product names;
  the range is rhinestone raya occasionwear, and 64 of 250 items were menswear.
- **Beyond Label** — good recent items, but the rest is 3D sequinned flowers on organza and
  nothing published since Feb 2024.

## Verification

```
$ npx vitest run
 Test Files  11 passed (11)
      Tests  266 passed (266)
$ npx tsc --noEmit      # clean
$ npm run build         # ✓ compiled
```

**A guard fired correctly and caught a real gap.** The first test run failed:

```
FAIL  lib/price.test.ts > the published catalogue contains no currency without an expectation
```

`AED` is a new currency and `lib/price.test.ts` deliberately fails until someone adds an
explicit formatting expectation for it. Added `expect(formatPrice(44.95,'AED')).toBe('AED 44.95')`
(with the NBSP separator). This is exactly the behaviour that test was written for.

## Notes / follow-ups

- **AED is now 830 items (9.4% of the catalogue)** and renders as `AED 580` — a bare code, no
  symbol — beside `$120` and `£120`. Accepted deliberately per ADR-0002 (native currency, no
  FX conversion), but it is the single biggest visual inconsistency the additions introduce.
  Four of the five are Dubai labels; if that reads badly on the grid, the lever is curation,
  not conversion.
- **Bouguessa is `community: 'general'`, not `'hijabi'`** — it is a full RTW label rather than
  modest-by-design. Checked after ingest: 0 kids items and 0 titles matching
  sleeveless/strapless/backless, so `normalizeProduct`'s existing filters handled it better
  than expected. It does carry "Signature Cropped Shirt" styles — cropped over high-waisted
  tailoring is defensible, but this brand warrants a per-product eye that the others do not.
- **CHI-KA landed 655 items**, far more than the 250 the feed's first page suggested — worth
  knowing that a "250" reading is a page cap, not a catalogue size.
- **The bigger lever is still pruning.** Measured before this work: Mariam's Collection alone
  carries 262 dated-occasionwear items (24.5% of its 1,071), with Feradje at 34.5%,
  LumosModesty 22.8% and Urban Modesty 22.2%. Adding 1,055 good items does not remove those;
  they still sit in the same grids.
- Not image-verified by me personally: Cult Abaya and Latifi (rate-limited at the time). Both
  were image-verified by the measuring agents and their feed metrics are the strongest in the
  set, but that is second-hand.
