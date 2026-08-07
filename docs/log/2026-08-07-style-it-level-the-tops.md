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

## Notes / follow-ups

- Brands for the six new pieces are still unknown — see
  `2026-08-07-style-it-six-new-pieces.md`.
