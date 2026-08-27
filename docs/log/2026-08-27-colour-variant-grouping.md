# Colour-variant grouping, phase 1 — one card per garment, with a "+N colours" badge
**Date:** 2026-08-27 · **Status:** done (phase 1 of 2)

## Goal
Tina: *"we have a lot of items that are the same just a different color. can we put only 1 in
the catalogue and if there are additional colors just stating that in the bottom right corner
with mini colors?"*

Phase 1 is the collapse plus a plain count badge — her choice, so the 5,334 duplicate cards go
away now rather than waiting on the coloured dots. Phase 2 is the dots.

## What changed
- **`lib/colorVariants.ts`** (new) — `splitColourSuffix()` and `groupColourVariants()`.
- **`lib/products.ts`** — `browseProducts` / `productsForLane` / `productsForBrand` each group
  as their LAST step. That is the one chokepoint both render paths share: `app/[lane]/page.tsx`
  and `lib/catalogueCards.ts` (the `/api/catalogue/cards` endpoint) both go through these three,
  so row indices and the endpoint's `products.length` staleness guard stay in agreement for
  free. Grouping inside `encodeCatalogue` instead would have desynced that guard on every call.
- **`lib/types.ts`** — `Product.variantCount?`, explicitly read-time-only and never published.
- **`lib/compactCatalogue.ts`** — a `rows.variantCount` column + `CardProduct.variantCount`.
- **`components/ProductCard.tsx`** — the badge, bottom-right of the photo.
- **`lib/houses.ts`** — `categoryCards()` now counts grouped, so a category tile cannot promise
  5,099 hijabs and land the visitor on a grid of 2,913. Its own comment already asked for
  "what's actually shown"; grouping just moved what that is.

## Measured effect
`getProducts()` is unchanged at 18,889 — nothing is removed from the catalogue, only collapsed
on the way to a grid.

| lane | before | after | badged cards |
|---|---|---|---|
| Hijabs & Scarves | 5,099 | **2,913** | 229 |
| Abayas | 4,475 | **3,826** | 272 |
| Tops | 2,138 | **1,463** | 306 |
| Trousers | 1,456 | **957** | 194 |
| Dresses | 2,454 | **2,095** | 172 |
| Skirts | 1,082 | **737** | 134 |

Largest group: Nasiba's **Cotton Undercap, 106 colourways**, every one at £5.95 — checked by
hand, all 106 are genuinely the same cap.

## Design decisions, and the measurements behind them

**Detection is structural, not lexical.** It groups on the shared PREFIX and treats whatever
differs as the variant axis, so it never asks "is this word a colour?". That is deliberate:
a colour vocabulary would have to be correct in English, Turkish, Dutch, French and German,
and §10.31 is the entry about `\b` not meaning what you want in Turkish. Positional evidence
has no language. Measured cost: of 6,896 grouped rows only **73 (1.1%)** have a non-colour
suffix — "146 cm", "long sleeve", "s/m 142 cm" — and `NON_COLOUR_SUFFIX` excludes those,
because collapsing a SIZE run would hide real choices rather than duplicates.

**The leading-colour pattern is deliberately NOT handled.** "Chocolate Linen Cotton Wrap Top"
(Jawda's whole catalogue) looks like the same shape and would add 1,064 groups / 2,988
products. Measuring it is what killed it: the identical rule also groups Sistrs' "The Riella
Label" with itself and Esme NY's "Tulip"/"Batwing" tops, which are STYLE names. Merging two
different garments into one card is a worse failure than leaving a duplicate. Needs a real
vocabulary; deferred to phase 2, which is building one anyway.

**Which colour fronts the card: the first in existing order — and this was measured, not
assumed.** Tina picked "the one with the best model photo", so I checked whether that could
ever choose: across 40 sampled groups, **100% agreed on portrait-vs-not and 95% had identical
aspect ratios.** Brands shoot every colourway the same way, so the tiebreak had nothing to
choose between in a single group. Keeping input order also means no ordering churn anywhere.

**Grouping runs LAST, after every other filter.** So a card's count only ever counts siblings
that surface is actually showing — a lane cannot advertise "+5 colours" when four of them were
filtered off it. Covered by a test.

## Verification
```
$ npx tsc --noEmit → clean      $ npm run lint → exit 0
$ npm test → 54 files, 879 passed (10 new in lib/colorVariants.test.ts)
$ npm run build → all routes built
```

## Notes / follow-ups — phase 2, the coloured dots
Tina chose **name-first with photo as fallback**, after I measured and corrected my own claim.
I had told her photo sampling was "accurate by construction". It is not:
- Naive dominant-colour sampling scored **68%** on a 44-image labelled set, failing hardest on
  hijabs, where the face fills the crop — "White" came out `#9a6955`, a skin tone.
- A **difference-based** method is much better: within a group every variant is shot
  identically except the garment, so the pixels that VARY across the stack *are* the garment.
  That fixed every skin-tone failure (Navy `#b1865a` → `#1b1a1e`, Chocolate `#29374e` →
  `#7f5c54`). It also self-detects failure — when the mask latches onto the wrong region the
  variants all come out nearly the same hex, which is checkable. 55 of 60 groups passed that
  check, but eyeballing the passes still showed ~2 in 12 wrong, so ~80% overall.
- Name coverage is the missing half: 52% of grouped suffixes are already a plain colour word,
  and most of the rest ("butter yellow", "forest green", "bordeaux", "sage green") are
  resolvable with a curated vocabulary of a few hundred entries.

So phase 2 = vocabulary first, photo only where the name does not resolve, name wins on
disagreement, and no dot at all rather than a wrong one. The vocabulary also unlocks the
leading-colour pattern above.

---

## Merged to `main` and verified on production
**Status:** live · `origin/main` `f102cf2 -> 4871fba`

Seven commits fast-forwarded: this one plus six catalogue-curation commits from other sessions
(Urban Modesty's 20 hand-picks back in, then 14 cuts and 13 garment/lane moves across three
batches). `main` and `staging` identical.

Pre-push: `npx tsc --noEmit` clean · `npm run lint` exit 0 · `npm test` 54 files / 879 passed ·
`npm run build` all routes.

**§10.47 discipline applied.** Discriminator chosen first — `/modest-hijabs` `rowCount`, 2,916
in this build against production's 5,099. Polled the ORIGIN past the edge with a junk query
string; it flipped on the 6th try (~100 s after the push). Only then purged.

```
purge success: True
                 fetch 1        fetch 2
/modest-hijabs   MISS 2916      HIT 2916     (was 5099)
/modest-abayas   MISS 3818      HIT 3818
/modest-dresses  MISS 2103      HIT 2103
/modest-trousers MISS  942      HIT  942
/modest-sets     MISS  519      HIT  519
```

Then drove the real page on **https://themodestyhouse.com/modest-hijabs** with Playwright:
badges render `["+8 colours","+3 colours","+13 colours","+34 colours","+1 colour"]` (singular
form correct), 24 cards with zero duplicate links, the badge computes
`pointer-events: none` and `elementFromPoint` at its centre still returns the card anchor, and
clicking the card still opens the brand (voilechic.com).

### Two shell faults while verifying, both already in the mistakes log
Neither touched the site; both made a verification print confident nonsense.
1. `set -- $p` **did not split** — zsh does not word-split unquoted parameters (§10.20). The
   loop printed `want=` empty and every row as `MISMATCH`, against a deploy that was fine.
2. Wrapping the check in a **shell function lost `PATH`** (the §10.48 `.env` clobber, still
   resident), so `curl`/`head`/`tr`/`awk` were all `command not found` and every row again read
   `MISMATCH` — with nothing having run. Falling back to system `python3` then failed too:
   macOS ships it against **LibreSSL**, which cannot negotiate TLS to Cloudflare
   (`TLSV1_ALERT_PROTOCOL_VERSION`).
   Settled by calling `/usr/bin/curl`, `/usr/bin/grep` etc. by absolute path with no function
   and no PATH dependency.

The reason neither wasted more than a minute: the check prints `want=` beside `got=` and labels
the row `OK`/`MISMATCH`, so "nothing ran" looked wrong rather than looking like a finding —
which is the whole point of §10.28 rule 3.
