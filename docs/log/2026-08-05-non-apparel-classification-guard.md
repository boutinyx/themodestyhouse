# Non-apparel classification guard + image-picker fix

**Date:** 2026-08-05 · **Status:** done (Phase 1–2; re-scrape pending)

## Goal

Tina reported a **prayer mat** published as clothing in the directory ("The Prayer Room —
Set of 6", tagged as a co-ord `set`), and separately a **size chart** rendered as a product
photo. She asked how we avoid this in future — i.e. a systemic fix, not a patch.

## Root causes (two distinct bugs, one shared shape)

Both were heuristics matching a weak positive signal with **no negative evidence**.

**1. Garment tagging.** `GARMENT_RULES` in `lib/tag.ts` had no word boundaries and no
non-apparel veto, so:
- `/set/` matched "Set of 6" → prayer mats became co-ord sets. Also matches "clo**set**",
  "off**set**", "sun**set**".
- `/top/` matches "lap**top**", `/vest/` matches "in**vest**ment".
- ~60 metal hijab magnets/pins were tagged `hijab` because the title contains "Hijab".
- Verified: `Closet Organizer` → `set`, `Laptop Sleeve` → `top`.

**2. Image selection.** `pickImage()` treated "first portrait image" as a model shot. On
brands that shoot square, the *only* portrait image is the size chart — so it skipped every
real photo and picked the chart. This was **self-inflicted earlier the same day**, shipped
without testing against a square-shooting brand.

## Method

An 8-agent `Workflow` (978k tokens): 3 discovery agents → rule design → **3 adversarial
attack agents** hunting false positives → finalize. The adversarial phase was the point:
it overturned the first design, which would have deleted real clothing (magnetic-closure
abayas, wearable prayer garments/telekung, "Tasbeeh Print" hijabs, brooch dresses).

I then re-verified independently rather than trusting the output.

## What changed

| File | Change |
|---|---|
| `lib/nonApparel.ts` | **New.** Layered non-apparel veto: TIER_0 absolutes → PROTECT (wearables that look like homeware) → TIER_A anchored compounds → garment-bundle amnesty → TIER_B bare nouns, head-position guarded |
| `lib/nonApparel.test.ts` | **New.** 145 tests, incl. 142 literal catalogue titles (63 must-drop, 79 must-survive) |
| `scripts/build-data.mjs` | Applies the veto; writes `rejected.json` + `review.json`; adds 3 structural guards |
| `lib/normalize.ts` | `pickImage()` now requires portrait to be the *dominant* format |
| `data/exclusions.json` | Added `nonApparelAllowIds` (escape hatch) and `brandNonApparelExpected` |

**Key design decision — precision over recall.** A false veto deletes real inventory; a miss
only leaves an item in the review queue. So bare `magnet`, `tasbeeh`, `kohl`, `decor` are
*not* absolutes — each collides with real garment titles (closures, prints, colourways).

**Structural guards** (none of them deletes anything):
1. **SKU-family contamination** — if ≥50% of a `(brand, skuPrefix)` family is vetoed, its
   survivors go to `review.json`. This is how an *unknown* future category surfaces with no
   regex written for it.
2. **Drift ratchet** — a rebuild moving the published count by >±40 fails unless
   `ALLOW_LARGE_DIFF=1`.
3. **Per-brand rate ceiling** — no brand exceeds 25% non-apparel without being declared.

## Verification

**Port fidelity** — the TypeScript port vs the validated reference, across every raw row:

```
rows           : 13435
TS port rejects: 248
reference      : 248
MISMATCHES     : 0
```

**A false positive I caught by hand-auditing the diff** (the adversarial agents missed it):

```
Abaya With Lantern Sleeves Made Of Crepe Material (MA124)  ← vetoed on "Lantern"
```

A real abaya with lantern-style *sleeves*. Cause: the subordinate strip correctly reduced
the head to `"Abaya"`, then the collapse guard rejected it as too short and fell back to the
full title, re-exposing "Lantern" to TIER_B. Fixed by treating a garment noun as
content-bearing evidence. Rejects went 248 → **247**.

That case is now a permanent test, and I proved it actually guards:

```
# with the fix reverted
× keeps real clothing: Abaya With Lantern Sleeves Made Of Crepe Material (MA124)
# restored
Tests  145 passed (145)
```

**Guard 3 caught a bug in itself.** It first failed on `mehijabi` (63% non-apparel) — but
mehijabi is brand-blacklisted, so 100% of its rows are rejected by definition. The guard was
counting *all* rejections instead of only non-apparel ones. Fixed. It then correctly flagged
`klay` (8/10) and `culture-hijab` (8/38); I inspected both by hand — klay is a genuine
accessory brand, culture-hijab's drops are exactly the prayer mats — and seeded them as
expected.

**Build:**

```
$ ALLOW_LARGE_DIFF=1 npm run build:data
non-apparel:hardware 95 | prayer-goods 15 | jewellery 18 | home 14 | bags 12
non-apparel:beauty 9 | hair 7 | non-product 6 | care 1
Published 6289 products (mixed across 33 brands) | rejected 2998 | review 42
```

Reported items, confirmed gone from the published catalogue:

```
✅ prayer mats: 0   ✅ hijab magnets: 0   ✅ gift cards: 0
✅ enamel pins: 0   ✅ jewellery sets: 0
```

```
$ npx vitest run
 Test Files  5 passed (5)
      Tests  160 passed (160)

$ npx tsc --noEmit     # clean apart from the pre-existing normalize.test.ts fixture error
```

## Notes / follow-ups

**Not yet done — the image fix needs a re-scrape.** `pickImage` only runs at scrape time and
raw rows store just the chosen image, so the ~25 Mariam's size-chart images are still live
until those brands are re-scraped. Same for the word-boundary tagging fix: `build-data.mjs`
never re-runs `tagDiscovery`, so existing rows keep their old `garment`.

Priority order for the re-scrape (from the spec's contamination analysis): `mariams` (90 of
248 rejects, and the size-chart brand), then `vela`, `arakai`, `aab`, `niswa`, `zahraa`,
`culture-hijab`, `klay`, `haute-hijab`.

**Deferred deliberately:**
- The `lib/tag.ts` word-boundary rewrite is designed but **not yet landed** — it is inert on
  frozen rows anyway, and needs the "never downgrade an existing garment to `other`" guard.
- `Product.raw` (persisting `product_type`/`tags`) — the durable fix so future
  reclassification never needs a re-scrape. Currently **0 of 13,435 rows** carry these
  signals, which is exactly why every tagger fix costs a full re-scrape today.
- `exclusions.json` pruning. Its `gift set` pattern still kills ~15 legitimate multi-hijab
  bundles, and `incense` kills 2 hijabs in an "Incense" colourway. Retire a pattern only
  once the veto is shown to catch everything that pattern was catching.

**Honest limitation:** the 247 rejects were audited for *precision* (0 false positives after
the Lantern fix). Recall is not independently measured — `Hijab Steamer`/`Hijab Mannequin`
style titles would still pass. Guard 1 is the backstop for that class.
