# Jamila two-piece was showing the flat-lay — image override

**Date:** 2026-09-05 · **Status:** done

## Goal

Tina, with the product link: *"the picture now used for this item is a flatlay
there is one on a model can you use that one"* —
`parladusa.com/products/zweiteiler-14`, published here as
`parladusa:15112769143110` "Jamila two-piece".

## Why `pickImage` got it wrong

This is the gap CLAUDE.md §7 already names, firing backwards. The feed has
exactly two images:

```
[0] 1023x1537  ratio 1.50  ...C263.PNG   ← the MODEL shot (brown)
[1] 1536x2267  ratio 1.48  ...CE1.JPG    ← the FLAT-LAY (beige)
```

Both signals `pickImage` has are useless here. **Aspect** cannot separate them —
both are portrait at ~1.5. **Format** actively misleads: the rule prefers a
`.jpg/.webp` over a `.png` because a PNG is normally a flat cutout and a JPG is
normally a photograph, and this brand did the exact opposite. So the heuristic
picked the flat-lay *because* it was the JPG.

That is not a bug to fix in the heuristic on the strength of one product
(§10.11 — a rule validated on the case that motivated it is how the size-chart
picks shipped). Inverting the format preference would break every brand that
uses the convention correctly. The durable fix §7 names is person detection over
the image array; until that exists, this is what the override file is for.

## What changed

- `data/image-overrides.json` — one entry, `parladusa:15112769143110` → the PNG.
- `data/products.json` — republished; the row's `image` is now the model shot.

The override is applied at PUBLISH time (`scripts/build-data.mjs:228`), not at
ingest, so it survives every future refresh — raw rows are frozen at the tag
logic that scraped them (§8), and a re-ingest would otherwise restore the
flat-lay.

## One thing worth flagging, because it is a visible change Tina did not ask for

The product sells in **two colourways — Beige and Braun** — and the two
photographs are of different ones: the flat-lay is the beige, the model shot is
the brown. Using the model shot therefore changes the card from beige to brown.
That is what §7 asks for (a model shot over a flat-lay, always), but it is a
colour change on a card, so it was said out loud rather than slipped in.

## Verification

```
npx vitest run lib/imageOverrides.test.ts   → 4 passed
npm test                                    → 62 files, 1,104 passed
published image → …080D220D-675D-45D1-846D-2FED078CB263.png (the model shot)
```

The override file's own guard — *"actually reaches the published catalogue"* —
failed before the republish and passes after it, which is the check doing
exactly its job: an entry that is never published is an entry that does nothing.
