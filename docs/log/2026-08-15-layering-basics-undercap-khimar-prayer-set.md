# Layering Basics: add Undercaps, Prayer Khimaars, Prayer Sets; clickable subtypes like Outerwear

**Date:** 2026-08-15 · **Status:** done

## Goal

Tina: "i want a sub catagory for hijabs. i want khimars, praying sets, undercaps
at layering basics. and btw i want the sub catagories of layering basics to be
like outerwear sub catagories so i want to be able to click them."

Two parts: (1) three new Layering Basics subtypes, moving specific
hijab/abaya-classified products there; (2) Layering Basics's subtypes get the
same header-flyout + mobile-disclosure treatment Outerwear already has, in
place of the old in-page "Type" dropdown.

## Scope clarified before writing any classifier

Checked the real catalogue before touching anything (this project's own rule,
per repeated mistakes logged in CLAUDE.md §10). Two of the three terms were
far bigger and more ambiguous than "a few items":

- **Khimar** (211 titled products): ~190 are garment:'hijab' cape-style
  headcovers ("Khimar Medina silk") — a standalone hijab style, not layering.
  ~20 (later measured at 48 after refining the regex) are garment:'abaya'
  full-length prayer coverings ("Mastour Khimaar Burnished Lilac"). Asked
  Tina which — she chose **abaya-length prayer khimaars only**.
- **Prayer** (184 titled products): mostly complete standalone outfits
  (dress/abaya/skirt/trousers), not accessories worn under something else —
  only 18 were garment:'set'. Asked what she meant by "praying sets" — she
  chose **every prayer-titled product, all garments**.
- **Undercap** (313 titled products): unambiguous, essentially all
  garment:'hijab', no ambiguity — moved without asking.

## What changed

- `lib/types.ts`: `LayeringSubtype` gains `'undercap' | 'khimar' | 'prayer-set'`.
- `lib/specialty.ts`:
  - `UNDERCAP_RE`, `KHIMAR_ABAYA_RE` (gated to `garment === 'abaya'`), `PRAYER_RE`.
  - `isLayering()` checks these three FIRST, ahead of the existing
    hijab/underscarf/bonnet exclusion — they're exceptions to that older
    rule, not subject to it.
  - `layeringSubtype()` sorts into the three new groups, narrowest first
    (undercap → khimar → prayer-set → the existing groups).
  - `LAYERING_SUBTYPE_LABELS` gains Undercaps / Prayer Khimaars / Prayer Sets.
- `lib/lanes.ts`: `modest-hijabs`'s match gained `&& !isLayering(p)` — some
  jilbab-titled products are ALSO prayer sets ("2-Piece Prayer Set (Jilbab)"),
  and without this guard they'd show on both lanes at once. Same pattern
  `isOuterwear()` already uses against `isLayering()`.
- `components/Nav.tsx`: Layering Basics gets a hover flyout to all 9 of its
  subtypes (not just the 3 new ones), same mechanism as Outerwear's.
- `components/MobileNav.tsx`: Layering Basics gets its own disclosure row
  (own `layeringOpen`/`layeringRowRef` state, same scroll-into-view fix
  Outerwear's already has). The shared-ref-through-a-function-parameter
  refactor I tried first failed `eslint-plugin-react-hooks`'s `refs` rule
  (`Cannot access refs during render` — it can't statically prove a ref
  threaded through a generic helper is only ever used for `ref=`), so this
  stayed two near-duplicate functions (`outerwearRow`/`layeringRow`) sharing
  only the ref-free `subtypeLinks` sub-render, not a single parameterized one.
- `components/FilterableGrid.tsx`: removed the in-page "Type" dropdown that
  was Layering Basics's only way to filter by subtype (it existed only
  because Layering Basics had no flyout of its own — see the comment removed
  here) — now behaves exactly like Outerwear's 2026-08-13 change. The
  underlying `type`/`typeIdx` filtering by URL `?type=` is untouched; only the
  in-page control to change it once there is gone.
- `data/lane-overrides.json`: 18 products that Tina had already moved to
  Layering Basics today via `/staff/curate` (before this subtype existed) —
  things like "Prayer Set - Olive", "Nisa Prayer Set", "Bizra Prayer Set" —
  were force-placed under the placeholder `cropped-body-shirt` subtype.
  Re-checked each one against what the new auto-classifier would now say
  (stripping the forced override and recomputing `layeringSubtype`): 18 of
  the 23 forced-`cropped-body-shirt` items agreed with `prayer-set`; those 18
  got their subtype corrected. The other 5 ("Salma", "Khimaar + Rok Set...",
  "Shara Mukena Set", two "...Nujum set" items) don't contain "prayer" or a
  garment:'abaya' "khimar" — no title signal the new regex would catch — so
  Tina's own manual choice stands, untouched.
- `npm run build:data` — needed once, only to bake the 18 corrected
  `lane-overrides.json` subtypes into `data/products.json` (the new
  auto-classification itself needs no rebuild — `isLayering`/`layeringSubtype`
  run live on `title`/`garment`, already-published fields, on every request).

## Verification

```
$ npx tsc --noEmit          → clean
$ npx vitest run --exclude '**/.claude/**'  → 40 files, 658 tests, all pass
$ npm run lint              → 0 errors (1 pre-existing unrelated warning in
                               .fontprobe.tmp.mjs, another session's file)
$ npm run build              → next build, all 34 routes generate cleanly

# Real-catalogue counts, computed via layeringSubtype() over data/products.json:
undercap: 313, khimar: 48, prayer-set: 182 (164 auto-matched + 18 corrected
overrides)
hijabs/layering-basics lane overlap: 0 (confirmed via LANES[].match)

# Playwright against a real `next start` build (port 4321, confirmed it was
# actually serving before testing — see CLAUDE.md §10.28):
- Desktop: hover Products → Layering Basics shows the flyout with all 9
  subtypes in canonical order (Neck Covers & Dickeys, Sleeve Extenders, Shirt
  Extenders, Base-Layer Tops, Cropped Body Shirts, Under-Dresses, Undercaps,
  Prayer Khimaars, Prayer Sets) — screenshot confirmed.
- Clicking Undercaps → /layering-basics?type=undercap, h1 "Undercaps",
  "Showing 24 of 313" (matches the computed count exactly).
- Clicking Prayer Khimaars → ?type=khimar, "Showing 24 of 48".
- Clicking Prayer Sets → ?type=prayer-set, "Showing 24 of 182".
- Mobile (390×844): tapping the Layering Basics row opens the same 9-item
  disclosure, auto-scrolled into view; tapping Undercaps navigates correctly.
- Regression check: Outerwear's flyout (Blazers etc.) still opens correctly
  after the shared-component changes.
- /modest-hijabs searched for "Undercap": 0 results (correctly moved out).
```

Two Playwright false negatives along the way, both resolved by reading the
DOM rather than trusting the first locator that matched: `getByRole('link',
{name: 'Layering Basics'})` never found the header trigger because it's a
`Menu.Trigger` (a button, deliberately not a `<Link>` — see the long comment
in `components/NavMenu.tsx` about the touch-tap race that decision fixed),
and `getByText('Layering Basics', {exact: true}).first()` kept resolving to
the FOOTER's link (which happens to sit earlier in DOM order than the header)
rather than the visible header trigger — caught by checking `boundingBox()`
against the actual viewport before trusting a locator, same lesson as
CLAUDE.md §10.26/§10.28.

## Notes / follow-ups

- Not committed or pushed yet — pending confirmation, since this is a code +
  behavior change to production, not a data curation batch Tina already
  explicitly asked to push.
- The 5 forced `cropped-body-shirt` items that didn't get corrected (Salma,
  Khimaar + Rok Set, Shara Mukena Set, two Nujum sets) are still findable —
  they just stay under Cropped Body Shirts rather than moving to Prayer Sets.
  If Tina wants those moved too, that's an explicit call, not something the
  regex should guess (same reasoning as the earlier khimar/prayer-set scope
  questions).
