# Remove the decorative eyebrow labels above page titles
**Date:** 2026-08-07 · **Status:** done

## Goal
Tina asked to remove the small uppercase labels sitting above headings — the
"Editorial" above *The Edit*, and the equivalents elsewhere — everywhere they
appear.

## What changed
17 kickers removed across 13 files:

| File | Removed |
|---|---|
| `app/page.tsx` | Curated modest fashion · Picks from the editor · Browse the index · For designers · The Edit |
| `app/editorial/page.tsx` | Editorial |
| `app/contact/page.tsx` | Contact |
| `app/about/page.tsx` | About |
| `app/directory/page.tsx` | The directory |
| `app/designers/page.tsx` | The house index |
| `app/favourites/page.tsx` | Your edit |
| `app/style/[vibe]/page.tsx` | Shop by style |
| `app/legal/LegalPage.tsx` | The House |
| `components/EditMagazine.tsx` | The List · Interview |
| `components/MagnifierHero.tsx` | Look closer |
| `components/VerifiedSpotlight.tsx` | Newly verified |

## What was deliberately kept
`.eyebrow` is not only a kicker style — it is also the site's small-label style.
Removing every instance would have broken working UI, so these stayed:

- **Form labels** in `ContactForm.tsx` (Name, Email, Subject, Message). These are
  real `<label>` elements; deleting them would break the form's accessibility.
- **Card and article metadata** — `{p.category} · {date}` on editorial cards and
  post pages, `{feature.category}` on homepage cards. These sit *under* their
  titles and carry information.
- **Footer column headings** (The House, Editorial, The Edit in your inbox) and
  the copyright line. These are headings in their own right, not labels above
  something else.
- **Control labels** — "Filter" in the index bar and grids, "Prices in" on the
  currency switcher.
- **`StyleIt`'s "Top + Bottom" / "One & done"** — these sit *below* their
  headings as subtitles, not above them.

## Verification
`npx tsc --noEmit` clean · `vitest` **362 passed (16 files)** · `next build`
compiled.

Checked against the prerendered HTML rather than the source, so the result is
what actually ships:

```
'The Edit'              -> 0 files
'Browse the index'      -> 0 files
'Picks from the editor' -> 0 files
'The directory'         -> 0 files
'The house index'       -> 0 files
'Shop by style'         -> 0 files
```

One `eyebrow>Editorial<` survives in `editorial.html` — inspected, and it is the
**footer's** Editorial column heading, which is correct to keep.

## Notes / follow-ups
- The code changes were swept into commit `dac8459` ("opt-in currency switcher")
  by a concurrent session that committed the whole working tree. The removals are
  intact; only the commit message is misleading about their origin.
- Several headings keep a `mt-3` that existed to space them from the kicker
  above. Harmless, but if the top spacing now looks slightly loose, that is why.
- The `.eyebrow` class itself is retained in `globals.css` — it is still used by
  everything in the "kept" list.
