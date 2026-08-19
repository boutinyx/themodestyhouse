# /hijabi-outfits retired
**Date:** 2026-08-19 · **Status:** done

## Goal
Answer Tier 2 item D of the SEO audit — "what is `/hijabi-outfits` for?" — and act on it.

## Why it went, and why that is not a code failure
It was one of the **original four lanes** (commit `63f19ae`, "Phase 1 — scraper,
curation tool, 4 lane pages, click-out"). Its idea was sound and is stated in its own
definition: `intro: 'Hijabs, abayas and modest pieces from hijabi-owned brands.'`,
matching on `community === 'hijabi'`.

That was a meaningful filter when the site carried a handful of brands, some hijabi-owned
and some not. Measured today:

```
BRANDS by community tag (113 total)
   hijabi     112   99.1%
   general      1    0.9%      <- HUM Clothing, the only one
```

**The premise dissolved; the code never broke.** A well-curated modest-fashion directory
turns out to be almost entirely hijabi-owned, so the lane resolved to "the whole directory
minus one house" — 3,221,821 B for 508 visible words, the heaviest page on the site, at
position 73 with 2 impressions over 12 months.

Tina's own reaction on being shown the item was *"i dont even recall that we had this"*,
which is its own evidence: it had not been a distinct thing for a long time.

The audit originally recommended rebuilding it as an editorial hub rather than retiring.
That recommendation was **reversed** once the 112/113 number was measured and given that
three writing tasks are already queued: a half-rebuilt editorial page is worse than none,
and the "hijab fashion" head term is properly won with an editorial post (Tier 2 F), not
with a product grid.

## What changed
Nine code references, found by grepping the **whole repo** rather than `app components lib`
— §10.32 is exactly the story of deleting a feature and missing `scripts/`.

| file | change |
|---|---|
| `lib/lanes.ts` | lane definition removed |
| `lib/seoCopy.ts` | `/hijabi-outfits` entry removed |
| `lib/laneAnswers.ts` | entry removed; `modest-hijabs`'s `related` repointed to `layering-basics` |
| `lib/lanes.test.ts` | two references removed, with a note on why |
| `components/Footer.tsx` | the `slug !== 'hijabi-outfits'` special case is gone with the lane |
| `scripts/visual-audit.mjs` | route list |
| `scripts/seo-snapshot.mjs` | weight list |
| `lib/compactCatalogue.ts` | stale comment |
| `next.config.ts` | **new `redirects()` block** — none existed before |

**308, not 404.** The URL was indexed and carried impressions, so it redirects permanently
to the page it had become a copy of rather than throwing that signal away. Contrast the
`/style/*` pages deleted 2026-08-09, which correctly still 404 — no page replaced them,
and a redirect is only right when a genuine destination exists.

`related` had to be repointed because `modest-hijabs` pointed AT the retired lane; left
alone that would have been a dead internal link. `layering-basics` is the honest
replacement — undercaps and base layers are the real companion to a hijab.

## Verification
```
npx tsc --noEmit                  exit 0
npx vitest run                    708/708 pass
npm run build                     34/34 static (was 35)
npm run audit:interaction         0 problems
npm run audit:mobile              0/9 overflow, a11y 0, stacked 0, aspect 0 — both engines
```
Against a real `next start` build:
```
/hijabi-outfits            HTTP 308 -> /directory      ✓
sitemap.xml                34 URLs, 0 occurrences      ✓ (was 35)
llms.txt                   0 occurrences               ✓ (regenerated, not hand-edited)
footer                     renders both remaining non-category lanes, no special case ✓
```

## Notes / follow-ups
- **`brandDropViolations` is not involved** — no catalogue data changed, only routing.
- This unblocks half of Tier 3 item A: `/hijabi-outfits` was the worst page in that
  analysis, and its 3.2 MB is simply gone rather than optimised.
- The next `scripts/seo-snapshot.mjs` run will show 34 URLs and should eventually show
  Google dropping the old URL. Until it recrawls, the snapshot will still list it as
  indexed — that lag is expected, not a defect.
- Documentation elsewhere (`CLAUDE.md`, `docs/architecture.md`, `docs/launch-readiness.md`,
  `docs/seo-geo-aeo-plan.md`) still describes the lane as live. Those are historical
  analyses; CLAUDE.md is updated, the rest are left as records of what was true when
  written.
