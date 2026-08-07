# The verified set is now Tina's five

**Date:** 2026-08-07 · **Status:** done

## What changed

**`data/brands.ts`** — the seal moved. It is owner-assigned curation, so this is
a data edit, not a code one:

```
gained verified   summer-evenings, inayah, glow-modesty
kept verified     veiled, aab
lost their seal   haute-hijab (editors-pick), mariams (verified), lanuuk (editors-pick)
```

`editors-pick` is now unused by any brand. The `Badge` type still allows it.

**`app/designers/page.tsx`** — the founder's-pick section is gone. It existed
because the pick and the vetted set were different; they are the same five now,
so a separate section rendered them twice on one screen. One grid, the vetted
five filling the first row, everyone else after. Both headings removed at Tina's
request — the page is the title, the standfirst, the grid, the pager.

Membership comes from the badge; `VERIFIED_ORDER` only decides who stands where,
so the two cannot drift apart. A house badged later that is not in that list
simply falls in after them.

## The knock-on nobody asked for

`badge` is also what the homepage's "Newly verified" rail sorts on
(`newlyVerified()` in `lib/houses.ts`). Reassigning it moved that rail too — it
now leads with Veiled, Aab, Inayah and Glow Modesty. That is consistent, and
arguably the point, but it was not part of the request and is worth knowing.

## Verification

```
npx tsc --noEmit     clean
npx vitest run       366 passed (366)
npx eslint           clean
npm run build        Compiled successfully
```

Served:

```
/designers          30 tiles   0 duplicates   5 seals   row 1 = Veiled, Aab, Summer Evenings, Inayah, Glow Modesty
/designers?page=2   28 tiles   0 duplicates   0 seals
homepage rail       Veiled, Aab, Inayah, Glow Modesty
```

58 houses over two pages, nothing shown twice.

## Notes / follow-ups

- `components/BrandMarquee.tsx` and `components/BrandCard.tsx` are unreferenced;
  the marquee keyframes are still in `globals.css`.
- `BrandCard` still branches on `badge === 'editors-pick'`, which no brand has.
