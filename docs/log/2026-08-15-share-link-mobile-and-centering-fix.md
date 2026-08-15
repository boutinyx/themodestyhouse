# Share-link page centering fix + share button on mobile/tablet
**Date:** 2026-08-15 · **Status:** done

## Goal
Tina: the product share-link page ("the link page") wasn't centered well, and the
"Copy share link" button in QuickView should also appear on mobile and tablet, not just
desktop. Asked to use Playwright to check phone/tablet/desktop and fix the UI.

## What changed
- `app/product/[brandSlug]/[shopifyId]/page.tsx` — `<main>` used
  `max-w-3xl mx-auto px-4 py-12`, which has no allowance for the site's `fixed` header
  (`components/Header.tsx`, `fixed top-0 ... z-50`). Every other page in the app follows a
  documented SHELL convention (`pt-32 md:pt-40`, see `app/directory/page.tsx`'s own comment:
  "the top padding clears the fixed header, whose bottom edge is at 88px at every width") —
  this page was the one page that never got it. Effect: the "← Back to the directory" link
  rendered at y=48, entirely hidden under the header, and the image/text column started
  almost flush against it — which is what read as "not centered." Fixed to
  `max-w-3xl mx-auto px-8 pt-32 md:pt-40 pb-16`, matching `/contact` and `/faq`'s own
  narrow-column pages.
- `components/QuickView.tsx` — the "Copy share link" chip was `hidden md:inline-flex`
  (desktop-only, from this morning's original build). Changed to plain `inline-flex` so it
  shows at every width; updated the comment that explained the old desktop-only reasoning.

## Verification
- `npm run build` (production build, not dev — WebKit needs a real build per CLAUDE.md
  §10.24) then `next start -p 3211`.
- Playwright script (chromium + webkit, both engines) at phone (390×844), tablet
  (820×1180), desktop (1440×900):
  - Product page: confirmed `.btn-pill` computed `border-radius` is non-zero (stylesheet
    actually loaded, not a blank WebKit render — §10.24/§10.26) at all 6 combinations.
  - Confirmed `<main>`'s left/right gap from the viewport edge is equal at every width
    (0/0 phone, 26/26 tablet, 336/336 desktop) — genuinely centered, not just visually
    close.
  - Confirmed via DOM query that "Back to the directory" now renders below the header's
    88px bottom edge instead of underneath it.
  - QuickView "Copy share link" button: measured its bounding rect on the real dialog —
    present and full-width (matching "Shop at…" and "Add to favourites") at all 6
    engine×viewport combinations; previously `visible: false` on phone at both engines.
  - Real tap-through test on a 390px viewport with clipboard permissions granted: clicking
    the button copies `https://themodestyhouse.com/product/niswa/10217348399402` to the
    clipboard and shows the "Link copied" confirmation text.
  - Visual screenshots (full page + cropped dialog) reviewed directly, phone/tablet/desktop.
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean on both changed files (the one reported warning is in a pre-existing
  untracked `.fontprobe.tmp.mjs` scratch file, unrelated to this change).
- Scratch Playwright scripts used for verification were temporary (`scripts/tmp-share-*.mjs`)
  and deleted after use — not part of the permanent test suite, since this codebase has no
  precedent for testing `app/**/page.tsx` / `components/*.tsx` (confirmed in the original
  94cb411 log entry).

## Notes / follow-ups
- Did not add a native `navigator.share()` path for mobile — Tina asked for the existing
  "Copy share link" button to also appear on mobile/tablet, not a different interaction, so
  scope stayed to visibility, not behavior (CLAUDE.md §10.18: implement what's asked, not an
  invented alternative).
- No test added asserting the SHELL padding — same reasoning as the original feature's log
  entry: no precedent for testing `app/**/page.tsx` files in this repo.
