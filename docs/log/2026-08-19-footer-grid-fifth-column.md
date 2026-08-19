# Footer: "The House" was wrapping to a new row, orphaned under a huge gap

**Date:** 2026-08-19 · **Status:** done

## Goal
Tina, from a screenshot: "the footer is still fucked." The footer's
"THE HOUSE" column (Designers/About/FAQ/Favourites/newsletter) was
rendering far below the rest of the row, under a large empty gap, instead
of sitting beside "Editorial."

## Investigation
`components/Footer.tsx`'s footer grid was `grid-cols-[1.4fr_1fr_1fr_1fr]`
at `md:` — 4 explicit column tracks. Today's earlier SEO commit (`6237f64`,
"make the 14 subtype pages indexable, fix link starvation, trim payload")
added a new "More" column (the non-category lanes: Modest Wedding Guest,
Modest Summer Outfits) as a 5th direct child of that grid, without updating
the template. With no 5th track and no `grid-auto-flow: dense`, CSS Grid's
default `sparse` auto-placement can't backfill an earlier row — so the 5th
child (previously "The House") fell through to row 2, column 1, landing
directly under the brand blurb with the full height of the 11-item
"Products" column (the tallest in row 1) as dead space above it.

## Fix
`grid-cols-[1.4fr_1fr_1fr_1fr]` → `grid-cols-[1.4fr_1fr_1fr_1fr_1fr]` — one
explicit track per direct grid child (brand, Products, More, Editorial,
The House), matching what the template already did for the previous 4.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 708/708 passing.
- `npx eslint components/Footer.tsx` — clean.
- Real browser (`next dev`), scrolled to the footer: all 5 columns now sit
  in one row — Products, More, Editorial, and The House (with the
  newsletter signup) side by side, no wrap, no gap.

## Notes / follow-ups
- General lesson: adding a new direct child to a CSS Grid with an explicit
  `grid-template-columns` needs the template updated in the same change,
  or the new/last child silently wraps instead of erroring — nothing
  catches this at build time.
