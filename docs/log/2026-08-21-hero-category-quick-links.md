# Add a category quick-links strip under the hero
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina sent a screenshot of aabcollection.com's icon row directly under their
hero (Abayas / Dresses / Sets / Hijabs / Occasion, each an icon + label +
arrow): "i want this on the hero."

## What changed
- New `components/CategoryQuickLinks.tsx` — a server component (renders
  inside `app/page.tsx`, itself a server component per CLAUDE.md §6, so no
  `'use client'` boundary needed for a row of plain links). Five tiles,
  one row at every width (mobile scrolls it horizontally with
  `overflow-x-auto no-scrollbar`, same pattern `EditorsRail` already uses;
  desktop stretches each tile to an equal fifth) — staying one row at every
  breakpoint is what keeps "hairline border on every tile but the last"
  simple, since nothing ever wraps to a new row.
- Wired into `app/page.tsx` directly under the hero `<section>`, before
  `<StyleIt />`.

## Real lanes, not invented ones
Each tile's `href` comes from `lib/lanes.ts` by slug lookup (`findLane()`,
throws if a slug goes missing) rather than a hand-typed path, so a future
slug rename breaks the build instead of silently producing a dead link.
Four of five map cleanly: Abayas → `modest-abayas`, Dresses →
`modest-dresses`, Sets → `modest-sets`, Hijabs → `modest-hijabs`.

**"Occasion" is a judgment call, flagged rather than silently decided.**
The site has no lane literally called "Occasion" — the closest real match
is `modest-wedding-guest` (`kind: 'occasion'`, its own `nav` label is
"Wedding", and its `match()` covers both `wedding` and `formal` occasion
tags). The tile is labelled "Occasion" — matching what Tina's reference
showed — while linking to that real lane rather than inventing a
destination. If she'd rather the label read "Wedding" (matching the lane's
own name honestly) or wants a broader/different destination, that's a
one-line change in `ITEMS`.

## Icons: no literal abaya/hijab icon exists in Phosphor
Checked the full Phosphor set (grepped ~1500 icon names) before picking
anything — there is no scarf, hijab, veil, robe, cloak, or abaya icon.
Rendered the real candidates as SVGs and compared them visually rather than
guessing from names alone:
- **Abayas → `CoatHanger`** (generic garment stand-in)
- **Dresses → `Dress`** (literal — Phosphor's own fitted-dress icon)
- **Sets → `StackSimple`** (two stacked layers, reads as a matching pair)
- **Hijabs → `Waves`** (closest abstract cue for draped/flowing fabric;
  rejected `CircleHalf` — reads as a settings/theme icon, not fabric — and
  `Hoodie`, which would visually conflate a hijab with a Western hoodie)
- **Occasion → `Sparkle`** (closest to the reference's own flower/sparkle
  mark)

This keeps CLAUDE.md §6's "every icon comes from Phosphor, never hand-drawn"
rule intact rather than drawing custom line art to match the reference's
own (non-Phosphor) icons exactly — the trade-off is these read as close
approximations, not literal abaya/hijab silhouettes.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx components/CategoryQuickLinks.tsx` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
  (The bare `vitest run` reports 2 failures inside
  `.claude/worktrees/jiggly-hugging-honey/lib/devOnly.test.ts` — a
  DIFFERENT session's isolated git worktree, not this repo's own
  `lib/devOnly.test.ts`, and untouched by this work. Confirmed unrelated by
  re-running with that path excluded.)
- Screenshotted desktop (1999px) and mobile (390px): five equal columns
  with hairline dividers at desktop, matching the reference's layout;
  horizontal-scroll row on mobile, confirmed scrollable with Abayas/
  Dresses/Sets visible and Hijabs/Occasion reachable by scrolling.

## Notes / follow-ups
- The existing "By category." section further down the homepage (photo
  cards, `lib/houses.ts::categoryCards()`) is untouched and unrelated — this
  is a new, separate strip, not a replacement.
- Icon choices (especially Hijabs → `Waves`) are approximations given
  Phosphor's real gap here. If Tina wants something more literal, the
  honest options are custom SVG line art (a deliberate, logged exception to
  §6, same tier as `VerifiedSpotlight`/`EditMagazine`'s raw `<style>`
  blocks) or accepting the abstraction.
