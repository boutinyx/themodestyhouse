# Twelve new picks on the homepage "Popular items" rail, and a brand renumbering that quietly killed two

**Date:** 2026-08-29 · **Status:** done (12 of 12)

## Goal
Tina: *"i want some new items in the propular of other brands or some in the homepage i wan
these products"*, with 12 product links.

## What changed
`lib/popularItems.ts` only — **no data change and no republish**. The rail stores ids and
`app/page.tsx` resolves them against the live catalogue at render time, so a pick can never
render stale data.

All twelve added, in the order she sent them. The rail goes **6 -> 18 ids across 13 brands**,
17 of which resolve today.

## The three Losyana picks, which were blocked and then were not
Three links were `losyana.shop` URLs while this catalogue still scraped `losyana.nl`. That is
not a bad link — measured at the time:

```
losyana.nl/products.json    -> 200, opens "Dubai Linen set - Black"
losyana.shop/products.json  -> 200, opens "linen corset & kimono - black"
wickel-linen-abaya-beige-1  .shop 200      madrid-2  .shop 200 | .nl 404
```

Two of her picks existed nowhere in `data/raw-products.json` (`/madrid/i` over 795 Losyana raw
rows: 0 hits); the third, "La Palma", we held only from `.nl`, out of stock and therefore
unpublished.

**Deliberately not resolved here**, because switching that brand's domain rewrites the
outbound URL of every Losyana product — a catalogue decision, not a rail one. A concurrent
session then did exactly that (`43d63af`, "move the house to losyana.shop and wire in the
affiliate code"), Losyana went 622 -> 826 published, and on the next look all three resolved:

```
losyana:15642554827077  abaya  wickel linen abaya - beige  €39
losyana:15870729847109  top    Madrid                      €39
losyana:15870585110853  set    La Palma                    €79
```

## What that move broke, found by re-checking rather than assuming
`.shop` issues its **own Shopify ids**, and product id is `${brandSlug}:${shopifyId}`
(Invariant 1). So every hand-picked Losyana id from the old storefront was orphaned by the
move. Measured across everything that hardcodes one:

```
hardcoded losyana ids in lib/: 12 | no longer published: 2
   DEAD  losyana:8786648891730   Emirate Abaya - Pink        (lib/popularItems.ts)
   DEAD  losyana:8955476967762   Emirate abaya - lightbeige  (lib/abayaPicks.ts)
data/dress-subtypes.json:    4 losyana keys,  4 no longer published
data/garment-overrides.json: 15 losyana keys, 15 no longer published
data/lane-overrides.json:     1 losyana key,   1 no longer published
```

The 10 ids in `lib/edits.ts` survived — they were already `.shop`-era ids.

**Fixed here:** the Popular-items one. `emirate abaya - pink` exists on the new storefront as
`losyana:9140604141893` (€59, was €25 — different storefront, different price), so it is
**remapped, not deleted**. Same product, same colourway; only the id changed, and the pick is
Tina's.

**Not fixed here, and raised instead:**
- `lib/abayaPicks.ts`'s pick was *lightbeige*, and the new storefront has white, mint, pink and
  caramel — no lightbeige. Substituting a colour is Tina's taste, not a repair.
- **The 20 orphaned override keys are the ones that matter.** A dead entry in
  `garment-overrides.json` does not fail loudly: the product simply reappears under a new id
  with *no* override, and is classified by `lib/tag.ts` again — which is exactly what those
  overrides existed to correct. So up to 15 Losyana products may now sit on the lane the
  tagger picks rather than the one Tina chose, silently. That belongs to the session that made
  the move; flagged to it and to her.

## One dead pick on the pre-existing rail, deliberately left
`eynaa-paris:10742646669655` (Essential Long Sleeved T-Shirt) stopped resolving some time
before today — `inStock: false`, `decision: keep`, not delisted, not rejected. `filter(Boolean)`
drops it silently, so the rail rendered 5 where the file said 6.

**Kept, with a comment.** Out-of-stock is reversible; a restock republishes it and the pick
returns with no action. Deleting it would permanently discard her choice to fix something that
fixes itself — the same reasoning that stopped `lib/dressSubtypes.test.ts` pruning delisted
ids on 2026-08-28.

## Verification
Every id resolved through the real read path (`getProducts()`), not by grepping the file:

```
POPULAR_ITEM_IDS: 18 | resolving: 17/18 | distinct brands: 13
```

Matched by **URL handle**, never by the pasted URL verbatim and never by title — two of the
twelve have titles that disagree with their own handle because the brand renamed the colourway
and kept the URL (`khaki-floor-length-hardware-tunic` is titled *"Olive Floor Length Hardware
Tunic"*; `the-unique-set-summer-top-soft-ivory` is *"The Unique Top Summer Soft Ivory"*).
Matching on the colour word would have found the wrong product or none.

`npx tsc --noEmit` clean. `npx vitest run` — 933 tests, 932 pass; the one failure is the
pre-existing `lib/edits.test.ts` `fall-essentials` check, unrelated and left firing on purpose.

## Notes / follow-ups
- **Nothing guards this list**, which is how the eynaa-paris pick went unnoticed and how the
  Losyana renumbering would have. A `skipIf(CI)` test shaped like `lib/colourLeads.test.ts` —
  every `POPULAR_ITEM_ID` and `ABAYA_PICK_ID` is known to raw and not cut — would surface both
  locally without becoming a CI gate over stock levels. Worth adding.
- **Generalisable:** changing a brand's `homepage`/`feedUrl` renumbers every product it owns,
  because the id embeds the Shopify id. Grep `lib/` and the curated `data/*.json` for that
  brand's slug in the same change — the ids are strings and no compiler will tell you.

## Production verification (appended after the merge)

**Staging could not be used, and that is worth recording rather than glossing.** The staging
service served a byte-identical payload (`415110 bytes`, `new picks 0/13`) for 25+ minutes
after the push. Established it was not a code fault before concluding anything:

- `npm run build` on **my commit** — succeeds, 32 routes.
- `npm run build` on the **staging head** (`76e63ca`, a third session's 17-commit colour-filter
  merge) — also succeeds.

So the Railway staging service simply stopped deploying; nothing was broken to fix. (The first
local build failed with `Symlink [project]/node_modules is invalid, it points out of the
filesystem root` — §10.38's Turbopack trap, from the worktree's symlinked `node_modules`. Redone
with `cp -al` and it built. A harness fault, not a build fault.)

Substituted the strongest available check: served the real production bundle locally
(`next start -p 3199`, port confirmed free first, `Ready` confirmed in its log before probing —
§10.28) and measured the homepage payload:

```
http://localhost:3199/   200 | 465,699 bytes | new picks 13/13 | controls 3/3
```

The controls are three pre-existing rail items. On the pre-deploy staging build the same probe
read `new picks 0/13 | controls 3/3`, which is what makes `13/13` mean something rather than
"the matcher works differently now".

**Only this commit went to `main`.** `3d0660d`'s parent is `43d63af`, i.e. `main` itself, so it
fast-forwarded on its own and deliberately left the colour-filter feature on `staging` —
another session's work that Tina has not seen. Asserted after the push:
`colour filter on main? no`.

Origin confirmed serving the new build before purging (§10.47), then `purge_everything` →
`success: true, errors: []`. Canonical URL, real GETs, twice:

```
pass 1: / 200 | cf-cache-status MISS | age -  | 465,630 bytes | your picks 13/13 | controls 3/3
pass 2: / 200 | cf-cache-status HIT  | age 0  | 465,630 bytes | your picks 13/13 | controls 3/3
```

And in a real browser against production: **17 outbound cards** in the Popular rail — exactly
the 17 of 18 ids that resolve, the eighteenth being the out-of-stock eynaa-paris shirt that is
kept on purpose.

**Note the protocol gap honestly:** §1 requires verification on the deployed staging artifact,
and that was not possible here. A local production build plus post-merge production checks is
weaker, because it cannot catch anything environment-specific. It was flagged to Tina before
the merge, not after.
