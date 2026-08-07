# Style-It: every top now renders the same size

**Date:** 2026-08-07 · **Status:** done

## Goal

The four newly added tops looked a different size from the six that were already
there. Level them.

## What changed

**`components/StyleIt.tsx`** — `TOP_FRAME.w` 138 → 180.

**`lib/stylePieces.ts`** — `maxW` on the three pieces still short at that width
(`top_4` 189, `top_8` 187, `top_11` 198); `maxW`'s doc corrected, it still
described the dress frame only.

## Why the frame and not the images

The frame was 138×184 — portrait. The old tops are slim garments shot on a body,
so width was never their limit and they filled the height. The new ones are
flat-lays of oversized pieces, about as wide as they are tall, so **width** ran
out first and they rendered short:

```
old   138x150  138x145  138x150  138x134  138x176  138x165
new   133x184  138x136  138x163  138x125
          ↑ tallest of all              ↑ shortest of all      spread 125-184 (59px)
```

No change to the artwork fixes this — the sage print is 1.10 wide-to-tall, so in
a 138px frame it cannot exceed 125px tall whatever the file contains. Only a
wider frame lets height become the limit instead. Sweeping it:

```
frame 138w   spread 125-184  (59px)   assembly 230/282
frame 160w   spread 145-184  (39px)   assembly 252/282
frame 180w   spread 163-184  (21px)   assembly 272/282   <- here
frame 190w   spread 172-184  (12px)   assembly 282/282   no slack left
```

190 levels them best but leaves the mix column with nothing to spare, so 180,
with the last three closing the gap via the per-piece artwork cap that already
existed for the abaya. Final:

```
  rendered   clear of arrow
  133x184       36px   Satin Collar Blouse
  187x184        9px   Oversized Tee        (maxW 187)
  156x184       24px   Ruffle Blouse
  198x179        3px   Printed High-Neck    (maxW 198)
  170x184       17px   Veiled · Rouched Top
  175x184       15px   Glow Modesty · Poplin Shirt
  170x184       17px   PLT · Cape Ruched Top
  189x184        8px   Veiled · Layla Top   (maxW 189)
  144x184       30px   Veiled · Textured Top
  154x184       25px   Veiled · Knit Drape Top
```

Spread 179–184, down from 59px to 5px. Only the sage print falls short, and it
is at its ceiling: any wider and the artwork touches an arrow.

## Cost

The mix column's arrows sit **21px further out** on each side, since they are
positioned by the frame. Bottoms were already uniform at 184 tall and are
unchanged in size — their arrows move with the same frame.

## Verification

```
npx tsc --noEmit     clean
npx vitest run       362 passed (362)
npx eslint           clean
npm run build        Compiled successfully
```

Checked visually by letterboxing every top into the real 180×184 frame with the
frame outlined, before and after.

## Revision, same day: capped by height instead

Levelling every top at 184 made them the same as each other but *bigger than the
trousers beside them* — 184 tall and up to 198 wide, against trousers that are
184 tall but 74-99 wide. The top loomed over the outfit.

So the frame came back to 170 and tops are capped at `TOP_ART_H = 150`, which is
below every top's fitted height. All ten now render exactly 150 tall, 109-165
wide, sitting alongside the trousers rather than over them — and 150 is where the
original six already were (134-176, mean 153). Bottoms still fill at 184.

Every per-piece `maxW` came off the tops: at this cap nothing reaches the frame's
width, so nothing needs to overflow it. Only the dresses use `maxW` now.

## Brands, confirmed

Tina supplied the six source URLs. Each was checked against the store's own
`/products/<handle>.json` — vendor and title — and the store photo compared with
the cutout to confirm the piece:

```
Hijab Boutique   Blouse - Olive                     -> top_7
Hijab Boutique   Oversized Cotton Top - Roze        -> top_8    ("Roze" dropped, 4)
Hijab Boutique   Ruffle Blouse - Yellow             -> top_9
Jawda            Olive Print Top                    -> top_11
Nasiba           Solace Wide Leg Pants - Charcoal   -> bottom_7
Merrachi         Frayed Hem Pants | Sand            -> bottom_8
```

The Merrachi identification is independently corroborated: the cutout carries an
embroidered **M** at its frayed hem, which is what prompted looking for a
monogrammed label in the first place.

Note `Hijab Boutique`, `Jawda` and `Merrachi` are not all in `data/brands.ts` —
`lib/stylePieces.ts` has always carried brands outside `BRANDS` (§8 landmines).

## Second revision: equal AREA, not equal height

Tina spotted the Veiled Textured Top reading smaller than the rest. It was —
measured, not guessed. Rendering every top at a common 150px height does not
make them the same size, because height and size are not the same thing: a tall
narrow garment spends its height on shape rather than cloth. The Textured Top's
asymmetric hem runs to a point, so at 150 tall it covered **0.72×** the garment
area of the median piece, while the Olive Print covered **1.22×**.

Each top now carries its own `maxH`, set so all ten cover the same ink area:

```
                    was        now
top_5  Textured    118x150 -> 138x176     0.72x -> 0.99x
top_3  Cape Ruched 138x150 -> 150x163     0.85x -> 1.00x
top_0  Rouched     138x150 -> 145x157     0.91x -> 1.00x
top_7  Olive       109x150 -> 113x156     0.92x -> 0.99x
top_6  Knit Drape  126x150 -> 128x153     0.96x -> 1.00x
top_9  Ruffle      127x150 -> 125x147     1.04x -> 0.99x
top_1  Poplin      142x150 -> 139x147     1.05x -> 1.00x
top_4  Layla       154x150 -> 149x145     1.07x -> 0.99x
top_8  Oversized   152x150 -> 142x140     1.15x -> 1.00x
top_11 Olive Print 165x150 -> 150x136     1.22x -> 1.00x
```

Spread 0.99–1.00×, from 0.72–1.22×. The target is the **median** ink area, so the
middle of the set barely moves and only the outliers travel. Every width stays
inside the 170px frame, so no arrow moves and no artwork overflows.

`TOP_ART_H` survives as the fallback for a piece added without a `maxH`.

**If a piece's artwork is replaced, its `maxH` must be recomputed** —
`sqrt(target / (inkFraction * w * h)) * h`. The value is a property of that
specific file, not of the garment.
