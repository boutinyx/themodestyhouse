# Outerwear replaced with Blazers & Vests / Cardigans & Sweaters / Jackets & Coats

**Date:** 2026-08-21 · **Status:** done

## Goal

Tina, comparing H&M's category naming: "i want outerwear gone and i want you to add those new ones." Confirmed via a clarifying question as H&M's literal 3-way split (not a simpler 2-way grouping, and not just a rename) — meaning real classification work, not just a nav label change, since we have no separate "Sweaters" or "Jackets" inventory today.

## Research before touching code

- `isOuterwear`'s 4-word regex + `p.garment === 'top'` gate already exists specifically to avoid the §10.10 false-positive trap (a "Vest And Skirt Set" or "Capo Blazer Dress" mentioning the word without being that garment).
- "Sweater" carries the identical risk on the same gate: 139 catalogue titles contain "sweater," but only 80 are `garment: 'top'` — the other 59 are real dresses/skirts/trousers/abayas/sets using it as a fabric or style word ("Sweater Dress," "Sweater Skirt"), not sweaters to pull out.
- "Jacket"-titled items (78, all already `garment: 'top'`) already resolve cleanly into the existing blazer/coat/cardigan buckets via the rightmost-word-wins logic — there's no separable "jacket" population distinct from what's already called "coat." H&M's own "Jacks & Jassen" (Jackets & Coats) is one category, not two, so this isn't a gap — Jackets & Coats is a rename of the existing Coat bucket, not a new split.

## Design: reuse, don't rebuild

`isOuterwear()`/`outerwearSubtype()` (`lib/specialty.ts`) still model ONE family with five subtypes (blazer/vest/cardigan/sweater/coat) — only `sweaters?` was added to the matching regex and label map. Renaming the function itself to match the new nav language would have widened the blast radius (`isSpecialty`, `compactCatalogue`, `FilterableGrid`, staff tooling, the `outerwear` `ForcedLane` value) for no behavioural gain — it's still internally one family of specialty tops. Only `lib/lanes.ts`'s lane definitions changed, from one `isOuterwear(p)` match to three, each additionally filtered by `outerwearSubtype(p)`:

- `blazers-vests` — blazer + vest (368)
- `cardigans-sweaters` — cardigan + sweater (189, sweaters pulled from Tops)
- `jackets-coats` — coat only (323)

`compactCatalogue.ts`'s `outerwearSubtypes` dictionary derives from `Object.keys(OUTERWEAR_SUBTYPE_LABELS)` filtered to what's actually present per page, so it needed zero changes — `sweater` flows through automatically. `lib/laneSubtypes.ts` explicitly restricts each new lane to its own two subtypes (not the whole domain), since that list also feeds `generateMetadata`/sitemap, which have no encoded catalogue to derive from at runtime.

## Files touched

`lib/types.ts` (OuterwearSubtype +sweater) · `lib/specialty.ts` (regex, labels) · `lib/lanes.ts` (3 new lane entries, `currentCategoryLabel`) · `lib/laneSubtypes.ts` (per-lane subtype restriction) · `lib/seoCopy.ts` (3 new SEO entries) · `lib/laneAnswers.ts` (3 new factual "what's the difference" answer blocks, same non-branded voice as every other lane per CLAUDE.md §10.18, plus fixed a related-lane self-reference bug caught while writing them) · `components/Nav.tsx` + `components/MobileNav.tsx` (flyout/disclosure wiring, both split into two) · `components/StaffEditControl.tsx` (`laneLabel` no longer silently degrades to the raw string 'outerwear' now that it isn't a real lane slug) · `lib/lanes.test.ts` (2 assertions updated to the new label).

`app/api/staff/live-edit/move-lane/route.ts` needed no changes — its subtype allowlist derives from `OUTERWEAR_SUBTYPE_LABELS` too. `app/sitemap.ts` and `app/llms.txt/route.ts` needed no changes — both derive from `LANES` directly.

## Known gap, not fixed here

`scripts/interaction-audit.mjs`'s outerwear-flyout section (~line 232) is now stale twice over: once already from today's earlier Clothing/Hijabs/Basics mega-menu rebuild (different DOM structure, `.mega-row` not the old flyout markup), and again from this split (`/outerwear?type=` no longer resolves, and no element's text starts with "Outerwear" any more). Fixing it properly means re-deriving the whole interaction model against the new mega-menu, not a string swap — flagged rather than half-patched, per CLAUDE.md's "say so and re-scope" rule.

## Verification

- Real data: `blazers-vests` 368, `cardigans-sweaters` 189, `jackets-coats` 323 — sum 880 = the old 804 + exactly the 76 new sweaters pulled from Tops. Zero overlap between the three. `modest-tops` (2,114) confirmed to leak zero outerwear-family words.
- Live, via Playwright against the running dev server: all three new routes return 200 with the correct `<h1>` and correct chip count (2/2/0); `/outerwear` now 404s rather than silently serving stale content.
- `npx tsc --noEmit` clean. `npx vitest run lib/ app/`: 78 files / 1317 tests pass (the only 2 failures anywhere are in `.claude/worktrees/jiggly-hugging-honey/`, a separate git worktree from a different session, unrelated to this repo's working tree).