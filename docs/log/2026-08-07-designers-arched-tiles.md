# Designers page: arched tiles, caption beneath

**Date:** 2026-08-07 · **Status:** done

## Goal

Tina picked variant 07 from `docs/mockups/designers-grid-variants.html` — the
arched crop with the caption below the image.

## What changed

**`app/designers/page.tsx`** — the featured six go from square tiles with the
name set over a scrim to a 3:4 portrait with an arched top and the name centred
beneath it.

**`components/BrandMarquee.tsx`** — the drifting cards take the same arch. Only
the top is shaped, so the name sitting at their foot is untouched.

## Three decisions the variant did not settle

- **Portrait, not square.** Fashion is photographed vertically; a 1:1 crop cuts
  most of these garments off at the waist.
- **The image is pulled down (`objectPosition: center 22%`).** The arch eats the
  upper corners, and on a model shot that is exactly where the head and neckline
  are. This was the objection raised when the variant was proposed, and it is
  the mitigation.
- **The seal moved under the name.** On an arched tile the top-left corner is the
  one place a badge cannot go — the radius clips it.

No scrim anywhere in the featured grid now. That is the point of the treatment:
the photograph is never dimmed to make room for type, and the name never has to
fight a busy picture — which matters here, because 58 shops means 58 different
backgrounds.

## Verification

```
npx tsc --noEmit     clean
npx vitest run       366 passed (366)
npx eslint           clean
npm run build        Compiled successfully
```

Served page: 6 arched featured tiles at 3:4, 0 scrims left in the featured grid,
5 badges, objectPosition applied.

## Notes / follow-ups

- The page had been rebuilt by a concurrent session (featured six + marquee)
  between the study being made and the variant being chosen; this is applied on
  top of that, not on the earlier version.
- `components/BrandCard.tsx` remains orphaned.
