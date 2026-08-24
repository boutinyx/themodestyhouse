# Categorize the hamburger menu to match the desktop header
**Date:** 2026-08-24 · **Status:** done

## Goal
Tina: "i want you to catagorize the hamburger menu like our new and
imporved header" (sent alongside a screenshot of the current desktop nav:
Clothing, Hijabs, Basics, Active, Designers, Editorial, About). The mobile
panel's Category list had Hijabs & Scarves and Layering Basics folded in
inline (each behind its own disclosure toggle), and Modest Swimwear /
Modest Activewear sitting as plain rows in that same flat list — none of
the three groupings the desktop header now has.

## What changed
`components/MobileNav.tsx`:
- The Category list (feeding `CATEGORY_LANES`) now filters out
  `modest-hijabs`, `layering-basics`, `modest-swimwear` and
  `modest-activewear` — same exclusion the desktop `Nav.tsx` applies.
- Three new top-level eyebrow sections, in the same order as the desktop
  nav: **Hijabs** (All Hijabs & Scarves + Khimars & Jilbabs + Undercaps),
  **Basics** (All Layering Basics + its 7 subtypes), **Active** (Modest
  Swimwear, Modest Activewear — no subtypes, matching the desktop Active
  panel exactly).
- Hijabs' and Basics' old disclosure-toggle rows (`hijabsRow()`,
  `layeringRow()`, their `useState`/`useRef`/`scrollIntoView` `useEffect`s)
  are removed — a tap-to-expand toggle existed to tell a group apart from
  the flat Category list around it; once it has its own eyebrow heading,
  that job is already done, so the entries are always-visible plain rows
  now (same as every other top-level row, via the existing `row()`
  helper).
- Blazers & Vests / Cardigans & Sweaters **keep** their disclosure —
  unlike Hijabs/Basics/Active, the desktop header still nests those inside
  Clothing's own panel rather than giving them a top-level slot, so the
  mobile treatment stays consistent with that.
- Removed a 2026-08-21 comment that had explicitly scoped a prior request
  to desktop-only ("Tina's ask was specifically about the desktop header's
  layout... mirroring the split wasn't part of that request") — today's
  ask supersedes it explicitly.

## Verification
Playwright at a 390×844 viewport, `next dev`:
```
eyebrow sections in order: [ 'Category', 'Hijabs', 'Basics', 'Active', 'Currency' ]
```
Full link list inside the panel confirmed the exact intended set and
order: Clothing → 7 Category rows + 2 disclosure triggers + Jackets &
Coats → All Hijabs & Scarves / Khimars & Jilbabs / Undercaps → All
Layering Basics + 7 subtypes → Modest Swimwear / Modest Activewear →
Designers / Editorial / About / Favourites. Screenshot confirms the visual
grouping reads correctly (Category eyebrow, then Hijabs eyebrow starting
with "All Hijabs & Scarves").
`npx tsc --noEmit` clean, `npm run lint` clean (0 warnings, `--max-warnings 0`).

## Notes / follow-ups
None outstanding — this was a direct, unambiguous restructure with a clear
desktop reference already built earlier this session.
