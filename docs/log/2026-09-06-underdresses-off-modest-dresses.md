# Under-dresses moved off Modest Dresses
**Date:** 2026-09-06 · **Status:** done (staging verification in flight)

## Goal

Tina: *"you need to check if there are underdresses in modest dresses with playwirght if
there are move them to underdresses"*.

## What was there

Driven on the LIVE site, not read from code. `/modest-dresses` held **53 cards that read
as an underlayer**, and **AbayaButh's entire presence on the lane — 41 of 41 filtered
cards — was inner slip dresses**:

```
AbayaButh      41 cards on the lane, 41 underlayers
Aab           202 cards,  6
Abaya Lounge    4 cards,  3
Veiled         48 cards,  2
ByHasanat      13 cards,  1
```

`UNDER_DRESS_RE` knew only `under dress` and `inner dress`. Houses that call the garment
an **"Inner Slip"** were invisible to it.

## What changed

`lib/specialty.ts` — two alternatives added to `UNDER_DRESS_RE`: `inner slip`,
`inner maxi dress`.

Each is a **two-word noun phrase**, never a bare `\binner\b` or `\bslip\b`, and that is
the whole design:

- `\bslip\b` alone takes every satin slip DRESS in the catalogue — nour-al-houda's
  "Saylor Satin Slip Dress" is photographed as a complete look, not an underlayer.
- `\binner\b` alone takes esme-ny's "Cinched Maxi Shirt Dress in White | inner included",
  which is a dress sold WITH one.

Both are pinned as negatives in `lib/specialty.test.ts`, alongside the existing
`garment !== 'abaya'` guard for bundled set listings and `FIXED_INNER_RE`.

**No re-ingest needed.** `isLayering()` runs at READ time on published titles
(`getProducts()` reads `data/products.json`), so unlike a `lib/tag.ts` change this reaches
the site on the next build — the opposite of the §10.12 trap.

## Verification

**Measured by ID against the pre-change tree in a detached worktree, not by count:**

```
modest-dresses    1999 -> 1952
layering-basics    225 ->  269      under-dress cards  78 -> 122
underlayers still on /modest-dresses: 0

published rows    19,172 -> 19,172, sets IDENTICAL   <- nothing was lost
modest-abayas / modest-skirts / modest-tops / modest-sets / modest-hijabs
                  membership byte-identical           <- controls from outside the change
```

Three ids looked like they moved oddly — two left dresses without joining layering, one
left layering. All three are colour-group LEADS: `groupColourVariants` picks a different
lead once the pool changes. All three are still published and their siblings are on the
destination lane. A count-only check would have shown a clean reconciliation and hidden
the question entirely.

`npx tsc --noEmit` clean · `npm run lint` exit 0 · `npm test` **1152 passed**.

**On staging, in a real browser:**

```
/modest-dresses                     Showing 24 of 1952
/layering-basics                    Showing 24 of 269
/layering-basics?type=under-dress   Showing 24 of 122

AbayaButh is no longer offered by the Brand filter on /modest-dresses
  — it has no dresses left there at all, which is the whole finding
control, first card on the lane: "Niswa Fashion — Aurelia Linen Convertible Dress"
```

The control row matters: a one-sided "the underlayers are gone" check would pass just as
well on a lane that had been emptied.

## Two harness faults, both caught before anything was believed

1. **A card anchor's `textContent` is EMPTY.** The `<a data-surface="product-card">` is a
   positioned overlay; the brand, title and price are its SIBLINGS. Reading
   `a.textContent` returned `""` for every card, and the first run reported
   **"0 underlayers"** on a lane where 41 of 41 AbayaButh cards had `inner` in their
   href. That is the exact shape of §10.26 — the harness lying in the direction of "all
   clear". The href count is what exposed it. The probe now reads
   `a.parentElement.textContent`.
2. **The brand filter uses `role="menuitemradio"`, not `menuitem`.** Every brand read as
   "not in the filter list", which looks like a site defect and is a locator bug.
3. **A `grep -o 'Showing 24 of [0-9]*'` deploy poll matched nothing, ever.** React splits
   `Showing {n} of {total}` across text nodes, so the number is never adjacent to the word
   in the HTML. The poll reported an empty count on every iteration for fifteen minutes —
   §10.48's shape, an empty result from a check that never ran. Replaced with a Playwright
   poll that reads the DOM.

## Deliberately NOT done

**Aab's "Full Slip" family — 25 rows — was measured and left alone.** `\bfull slip\b`
would have taken them, but:

- it contradicts a recorded decision, `18e6aaf` (2026-08-12): *"second skin top" narrowed
  to the top variant only, its Leggings/Slip are complete standalone garments*;
- and **Aab's own site disagrees with itself**, checked on the live product pages:

```
Full Slip Natural                -> "Full Slip Natural | Modest Slip Dresses | Aab"
Second Skin Full Slip Chocolate  -> "... | Modest Slips | Aab"
                                    "an extension of your own skin …
                                     expertly made to reduce transparency"
```

One is filed by the house as a dress, the other as an underlayer. That is Tina's call, not
a regex's. Current behaviour is pinned by a test either way, so whichever way she rules the
change is visible in the diff.

## Notes / follow-ups

- **Ambiguous "Slip Dress" pieces stay on Modest Dresses** — nour-al-houda (Saylor, Raya,
  Daniella), veiled ("Slip Dress - Nougat"), glamberry, ellem-atelier, ilovemodesty,
  abayas-boutique, culture-hijab ("Seamless Slip Dress"). Some of these may be underlayers
  too; each needs its own product page checked (§10.4), and several are styled as complete
  looks. Not swept in on a keyword.
