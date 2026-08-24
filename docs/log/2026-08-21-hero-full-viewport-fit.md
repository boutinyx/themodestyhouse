# Hero fills exactly one viewport, no scroll-through

**Date:** 2026-08-21 · **Status:** done

## Goal

Two requests from Tina in sequence:
1. Crop the hero image top and bottom a little so the text reads more centered.
2. "the picture needs to be same hight as screen because when i scroll now i still see a big piece of the pciture" — the hero was taller than one screen, so scrolling past it revealed a large leftover strip of photo before the next section began.

## What changed

**Image crop** (`public/hero-home-10.jpg`, registered in `scripts/optimise-images.mjs`):
100px trimmed off the top, 250px off the bottom of `hero-home-9.jpg` (5461x2822 → 5461x2472). Verified via Playwright that object-cover on this hero is height-constrained at every real viewport (source is 1.94:1, wider than any `hero-vh` box), so the source's full height always maps 1:1 to the box — nothing is vertically cropped by CSS, only left/right. Flagged directly to Tina before treating this as finished: the fixed-position text overlay's own pixel position does not move when the source image is cropped (confirmed identical `h1` bounding box before/after in Playwright) — the crop only changes what's visually behind a fixed-position text block, it cannot itself "center" that text.

**The actual viewport-overflow bug** (the real fix for request #2): `.hero-vh` (`app/globals.css`) was a flat `100svh` with no header subtracted. `Header` is `position: sticky`, which — per its own comment — deliberately reserves its own document-flow space rather than overlaying the hero. So sticky header height + 100svh hero always exceeded one viewport by exactly the header's height, and that leftover strip needed a scroll to pass.

Fix: `.hero-vh` is now `calc(100svh - var(--header-height))` (with a `100vh` fallback line, same reason as before — svh/vh can't both live in one React style prop). `--header-height` is a CSS custom property:
- A breakpoint-matched static fallback in `globals.css` (`54px` base, `89px` at `lg:`) for the instant before JS measures anything — avoids a layout jump on first paint.
- Corrected to the exact real value by a `ResizeObserver` in `components/Header.tsx`, which sets `--header-height` on `document.documentElement` from the header's live `getBoundingClientRect().height`. A `ResizeObserver`, not a one-time mount measurement, because the header's height already changes at the `lg` breakpoint and would again if the wordmark ever wrapped or a promo bar were added.

## Verification

Playwright, three viewports, header + hero vs. next section boundary:

```
desktop      (1440x900):  header=89px    hero=811px   next-section starts at y=900   exact fit
mobile       (390x844):   header=53.5px  hero=790.5px next-section starts at y=844   exact fit
desktop-tall (1440x1080): header=89px    hero=991px   next-section starts at y=1080  exact fit
```

`next-section starts at y=<viewport height>` in all three — header+hero now fill exactly one screen at every size tested, not just the one it happened to be built against. `npx tsc --noEmit` clean.

## Notes / follow-ups

- This working tree has other uncommitted, in-progress changes from earlier the same day (the Clothing/Hijabs/Basics mega-menu rebuild, `mega-row`/`mega-row-label` CSS, `.site-header .nav-link` size, `CategoryQuickLinks` swap, hero headline/overlay iteration) — none of that is mine, all pre-existed before this task and was left untouched. Per CLAUDE.md §10.30, this repo has concurrent-session risk; nothing here was `git add`ed or committed.
- The image-crop question (do you also want the *text block itself* nudged toward vertical center via CSS, independent of the image) is still open — flagged to Tina, not yet actioned.