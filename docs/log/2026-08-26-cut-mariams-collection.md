# Cut Mariam's Collection from the directory
**Date:** 2026-08-26 · **Status:** done

## Goal
Remove the brand `mariams` (Mariam's Collection, mariam-col.com) from the catalogue at
Tina's request. It was the second-largest house on the site by volume — 1,058 published
products, 5.3% of the catalogue — so the cut touches the published data, two editorial
posts and the homepage picks rail.

## What changed

**The cut itself** — the two edits §7 requires, so nothing fetches the feed again and
nothing can republish it:
- **`data/brands.ts`** — the `mariams` record removed. 113 brands → **112**.
- **`data/exclusions.json`** — `"mariams"` appended to `brands`. 15 blocked slugs → 16.
- **`data/products.json` / `data/rejected.json`** — republished with
  `ALLOW_LARGE_DIFF=1 npx tsx scripts/build-data.mjs`. `brandDropViolations` refuses a
  100%-drop otherwise; that flag is the documented way through it (§7).

Raw rows are deliberately left in `data/raw-products.json` (Invariant 12 — scrapers and
cuts never delete). So are the orphaned keys in `decisions.json`, `archetypes.json`,
`archetypes.clip.json` and `garment-overrides.json`, which match the existing drift §8
already documents for the nine other cut brands.

**Surfaces that named the brand**
- **`lib/popularItems.ts`** — the hand-picked homepage rail carried
  `mariams:9282768208088` (Satin Lace Trim Top, MS433), one of the 7 items Tina chose
  herself on 2026-08-23. Removed; **the rail is now 6**. The lookup would have dropped it
  silently anyway (the file's own comment says so), but leaving a dead id in a
  hand-curated list is misleading. **A replacement is Tina's call, not mine.**
- **`content/editorial/where-to-buy-hijabs-online.md`** — the house had a bullet in the
  `$10–$20` band linking to `/designers/mariams`, which stops existing the moment the
  record leaves `brands.ts`. Bullet removed and every derived number in the piece
  recomputed (below).
- **`content/editorial/best-abaya-brands-price-tiers.md`** — same, in "The everyday
  range". Bullet removed, "Five worth knowing" → "Four", dek "Fifteen of them" →
  "Fourteen" (14 house bullets remain, counted).

## Every number that changed in the hijab guide, and how it was derived
The method is `docs/log/2026-08-26-hijab-price-guide.md`'s own: `data/products.json`,
`garment === 'hijab'`, prices converted through `data/fx-rates.json`, medians per house,
fabric medians over **scarves only** (caps/undercaps/underscarves/bonnets/inners excluded).

It was rebuilt as a script and **validated against the pre-cut file before being trusted**:
it reproduces the published figures exactly — 5,046 hijabs / 75 houses, georgette 77/5/$10,
chiffon 738/28/$10.73, modal 808/31/$16, satin 213/18/$19.82, jersey 1,307/45/$20.75,
bamboo 278/24/$21.80, "twelve houses qualify, jersey dearer at eight, ratio 1.19" (the log
recorded 1.20), and 1,454 titles naming no fabric against the piece's "around 1,450". Two
lines differ by a hair and are noted below.

| in the piece | was | now |
|---|---|---|
| houses / hijabs | 75 / 5,046 | **74 / 4,845** |
| chiffon | 738 pieces, 28 houses | **706, 27** |
| modal | 808, 31 | **801, 30** |
| satin | 213, 18 | **203, 17** |
| jersey | 1,307, 45 | **1,301, 44** |
| bamboo | 278, 24 | **276, 23** |
| silk | 102, 11, median $29 | **93, 9, median $35** |
| georgette | 77, 5, $10 | unchanged |
| jersey-vs-chiffon | twelve houses, dearer at eight, ~20% | **eleven, seven, ~13%** |
| titles naming no fabric | ~1,450 | **~1,350** |
| instant / slip-on | 142 pieces, 18 houses | **134, 17** |
| undercaps and inners | 613 pieces, 30 houses | **586, 29** |

House-median endpoints ($2.32 Nurmirè → $95.66 Maison Hijab) are unchanged: Mariam's
median was $9.90, nowhere near either end. Zahraa ($16 vs $7.50) and Modern Hijabi ($15 vs
$20) still qualify and still read the same way.

**The two lines I could not reproduce exactly**, so they are delta-adjusted rather than
re-measured: instant (my regex finds 131 pre-cut against the piece's 142) and caps (615 vs
613). In both cases the *difference* Mariam's makes is measured on the same rows — −8
instant pieces / −1 house, −27 caps / −1 house — and subtracted from the published figure.
Flagged here rather than passed off as a fresh measurement.

## Verification
```
$ ALLOW_LARGE_DIFF=1 npx tsx scripts/build-data.mjs
Published 19024 products (mixed across 109 brands) | rejected 6201 | review 2126 | delisted-by-brand 2547
```
Diffed old vs new `products.json` by id, not by line (§8 — a republish rewrites most rows):
- **removed 1,058, added 0**, and **every removed id is a `mariams:` id**.
- `mariams` products remaining: **0**. Brands present in `products.json`: 109.
- 20,082 → 19,024 rows, which is exactly −1,058.
- `grep -rn -i mariam content/` → no matches.

Typecheck and tests were run in a clean worktree at this commit, because a concurrent
session has an unrelated catalogue-payload refactor in flight in this working tree — see
the note below.

## Notes / follow-ups
- **The homepage picks rail is 6 items.** Tina picked those seven herself; if she wants a
  seventh, she chooses it.
- **A pre-existing translation-cache defect surfaced in this publish and was fixed here**,
  because it would otherwise have shipped inside this commit. `data/title-translations.json`
  held 11 entries that were worse than no translation at all — nine of the form
  `"<Name> top" → "<Name> great"` (Google reading French/Dutch *top* as an adjective:
  Mila, Livia, Elena, Mira, Melia, Dalia, Anesa, Lia, Emilia) and two
  `"Brode Embroidery Detailed Trousers…" → "Embroidery Embroidery Detailed Trousers…"`.
  They were cached from an earlier run and only reached `products.json` now, as the rows
  they key came back through the nightly refresh. All 11 are set to the original title,
  which also stops `translate_titles.py` retrying them. **The underlying gap is that the
  script's validation accepts any non-error response** — nothing rejects a translation
  that turns a garment noun into an adjective, or doubles a word. Two survivors were left
  alone as arguable rather than wrong: `"Pul Payet …" → "Sequin Sequin …"` (both Turkish
  words do mean sequin) and `"Pantalon HAREM sarouel beige" → "HAREM harem pants beige"`.
- **The abaya guide's central claim is now stale, and not because of this change.** It
  says "sort all 91 houses by median price and there is a real, empty gap between $231 and
  $295". On today's catalogue the largest gap in that region is $245 → $295, because
  houses added since 2026-08-19 (Meriam Abdulaziz at $245, Esme NY at $195) landed inside
  it. Mariam's median was $39 and is irrelevant to it. Its aggregate counts (91 houses,
  5,213 pieces) are likewise as-of-publication figures that had already drifted to
  5,227/91 before this cut and are now 4,791/90. **Left alone deliberately** — rewriting
  the thesis of a published piece is an editorial call, not a maintenance one.
- **Concurrent session.** `lib/catalogueCards.ts` and `lib/catalogueCards.test.ts` are
  untracked work-in-progress from another session (`docs/superpowers/plans/2026-08-26-split-catalogue-payload.md`).
  Two things follow, neither a defect in this change: `npx tsc --noEmit` fails in the
  shared tree on their `components/DirectoryBrowser.tsx` / `components/FilterableGrid.tsx`
  edits, and their new test `indexes into the lane, not the whole catalogue` fails because
  it asserts that **row 40** of `modest-dresses` differs from row 40 of `browse` — a
  republish re-interleaves the whole catalogue (§8), so row 40 now coincides. **That
  fixture needs to not depend on a specific row index**, or it will break on every publish
  and on every nightly refresh.
