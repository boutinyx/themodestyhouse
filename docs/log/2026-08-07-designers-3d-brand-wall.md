# /designers — six featured houses, the rest in a 3D wall
**Date:** 2026-08-07 · **Status:** done

## Goal
Owner request: feature six brands, and put every other brand into a 3D marquee, on
`/designers`. Adapted from a shadcn/ReUI "3d-testimonials" component.

Before: `/designers` listed all 58 brands in one flat 5-column grid, with no hierarchy —
the five badged houses sat in the same treatment as everything else.

## What changed
- **`components/BrandMarquee.tsx`** (new) — tilted vertical columns of brand cards.
- **`app/globals.css`** — `@keyframes marquee-vertical`, `.marquee-col`, hover-to-pause, and
  a `prefers-reduced-motion` guard.
- **`app/designers/page.tsx`** — badged houses lead, first six get the existing tile
  treatment (now a wider 3-column grid), the remaining 52 go into the wall.

## Adapted, not pasted
The upstream component needed `cn` from `@/lib/utils`, `@radix-ui/react-avatar`,
`tw-animate-css`, shadcn's `Card`, and the `bg-card` / `from-background` /
`text-muted-foreground` token layer. **None exist here**, and this is not a shadcn project.

Rebuilt with **zero new dependencies**: the animation is two keyframes in `globals.css`,
the cards are plain markup on house tokens. See `docs/reference/` for the same pattern with
the Base UI navigation menu.

Two things the demo would have broken on:
- Its avatars come from `randomuser.me`, which **is not in the CSP `img-src`** allowlist, so
  they would have been blocked outright. The wall uses catalogue photography from
  `cdn.shopify.com`, which is allowed.
- There are **no brand logos** in this project — only product photography and the `badge`
  field — so a brand card is necessarily a product image with the house name over it.

## Decisions
- **Server component.** Nothing is interactive and the motion is pure CSS, so making it a
  client component would have serialised 52 brands into the RSC payload for nothing (§8).
- **Six featured = badged first, then catalogue order.** There are only five badged houses,
  so the sixth is taken by position rather than hardcoding a slug — it stays correct as
  badges are added or moved.
- **Each column renders its cards twice.** The keyframes travel exactly one copy's height
  (`-100% - gap`), so the second copy sits under the seam at the reset. The duplicate is
  `aria-hidden` and its links are `tabIndex={-1}`, so it is invisible to screen readers and
  to tab order.
- **Motion stops under `prefers-reduced-motion`** and the wall becomes scrollable instead.
  An endlessly moving wall is precisely what that setting exists for.

## Verification
```
$ npm run typecheck  clean
$ npm run lint       clean
$ npx vitest run     366 passed (16 files)
$ npm run build      Compiled successfully — /designers still ○ (static)
```

Served from a real `next start`:
```
featured cards (badge tiles): 5      (5 badged + 1 unbadged = the six)
marquee present             : true
brand cards in the wall     : 110    (6 featured + 52 x 2 copies = 110)
keyframes shipped           : true
reduced-motion guard        : true
no shadcn tokens leaked     : true
```

## Notes / follow-ups
- **Not seen in a browser.** The Chrome extension is not connected, so the 3D transform, the
  loop seam and the edge fades are confirmed only by build and markup. The tilt values
  (`rotateX 14deg / rotateY -8deg / rotateZ 12deg`) and the column speeds (52s + 7s per
  column) are the first thing to adjust if it looks wrong.
- Doubling the cards means **104 hotlinked images** on this page. All are `loading="lazy"`,
  but on a slow connection the wall will populate progressively.
- The featured grid went from 5 columns to 3 so six tiles read as a deliberate row rather
  than a partial one.
