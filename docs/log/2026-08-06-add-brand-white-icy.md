# Add brand: White Icy (French-language feed)
**Date:** 2026-08-06 · **Status:** done

## Goal
Add https://whiteicy.com as a new brand and publish its catalogue.

## Brand verification (before any code change)
Per §10.3, HTTP 200 proves nothing — the payload was validated:

- `https://whiteicy.com/products.json` → 200, valid JSON, `products[]` with plausible titles.
  Shopify, not Woo (`/wp-json/wc/store/v1/products` → 404 HTML).
- **29 products**, all in stock, all with images, all with descriptions.
- **Zero** men's or children's rows (`/homme|garçon|enfant|bébé|men's|kids/i` → 0 hits).
- Currency **EUR** (`"currency":"EUR"` in the storefront payload).
- Legal notice: *SHAKO (WHITE ICY), SARL, Marché Cifa Lot 97, 8-10 Rue de la Haie Coq,
  93300 Aubervilliers, France*. Hence `city: 'Paris'` (Aubervilliers is Greater Paris; the
  field is editorial and precedent includes 'Belgium', 'Europe', 'USA').

**Editorial note raised with Tina, not acted on:** €19.99–62.99, a Marché CIFA wholesale
address and a gmail contact put this at the budget end, which brushes against §7's "cut
mass-market/budget brands". Her call; added as asked.

## The real work: the tagger was English-only

The straight `add-brands.mjs` run ingested **18 of 29**. Investigating with
`normalizeProductDetailed`'s reasons showed two separate faults:

1. **11 dropped as `unclassified`** — `Chemise`, `Ensemble`, `Haut`, `Trench` mean nothing to
   `GARMENT_RULES`.
2. **11 silently MISCLASSIFIED as `trousers`** — worse, because they publish. In French
   **"jean" is the material (denim), not the garment**, and the trousers rule matches
   `/jean/`. So "Jupe en jean évasé Safiya" (a denim *skirt*), "Robe jean Mei col mao" (a
   denim *dress*) and "Veste trench en Jean Louise" (a denim *trench*) all published as
   trousers.

Same failure class as §10.10 — greedy substring matching — this time across a language
boundary. **Note that `scripts/translate_titles.py` cannot help here**: it translates at
publish time, while `tagDiscovery` runs at ingest on the original French.

### Fix
`lib/tag.ts`: French nouns added to existing rules (`jupe`→skirt, `ensemble`→set;
`pantalon` already matched via `pant`), plus one new rule placed **before** `trousers` so a
garment noun beats the fabric:

```ts
['top', /\b(veste|trench|manteau|chemisier|chemise|haut)\b/i],
```

`coat|jacket` were added to the **existing** (late) top rule, below `set`.

**Two rejected attempts, both recorded as comments in the file:**
- Putting `cardigan|coat|jacket` in the early rule broke multi-piece sets — "Cardigan
  2-Piece Set" and "Jacket and Pants Set" stopped being `set` and became `top`.
- Adding `/\brobe\b/` for French "Robe" = dress has no safe position: above `trousers` it
  turns English "Waffle Knit Robe Cardigan" and "Robe Skirt Set" into dresses; below
  `trousers` it never fires. **Accepted cost: one French denim dress ("Robe jean Mei col
  mao") stays tagged `trousers`** — cheaper than four English misclassifications. The test
  asserts the wrong-but-accepted value with the reasoning inline.

## Verification

Impact measured per §10.12 by running old rules vs new rules over all 17,195 raw titles —
old rules reconstructed literally so the diff isolates this edit:

```
changed by this edit — whiteicy: 17 | all other brands: 101
{ "other -> top": 98, "dress -> top": 3 }
```

**Zero regressions.** The 98 are outerwear that matched no rule at all and so appeared on no
lane and under no filter label. The 3 are corrections: "Modest Maxi Coat", "Solid Classic
Chiffon Modest Maxi Trench Coat" and "Autumn Long Coat … Belted Maxi Jacket" were being
called *dresses* by the `maxi`/`midi` fallback.

Those 101 rows belong to other brands, so they are still frozen at their old values (§8) and
will correct themselves on the next nightly refresh. No action needed.

```
$ npx vitest run     301 passed (12 files)   — was 266; +7 tag tests from real feed titles
$ npm run typecheck  clean
$ npm run build      Compiled successfully
$ npm run build:data Published 8838 products (mixed across 47 brands)
```

White Icy on the site: **29 of 29 published**, EUR, titles translated to English by the
`postbuild:data` hook:

```
top:14  abaya:3  skirt:4  trousers:5  set:3
  top      | Yamina - Oversized poplin shirt
  skirt    | Safiya flared denim skirt
  abaya    | ABAH denim abaya dress
  top      | Louise denim trench jacket
  set      | Victoria Blue Gingham Oversized Set
```

**A §10.12 near-miss caught during verification.** The published data briefly showed "Mei
denim dress" as `dress` while the code said `trousers` — because the brand was ingested
during a window when `tag.ts` still had the `robe` rule I later removed, and raw rows are
frozen at ingest. The stale value happened to be *more* correct, which is exactly why it was
dangerous: tonight's refresh would have flipped it with no explanation. Re-ingested so raw
and code agree.

## Files changed
- `data/brands.ts` — the White Icy record
- `data/translate-brands.json` — `{"manzaram":"nl","whiteicy":"fr"}` (required by §4, or
  titles publish in French)
- `lib/tag.ts` + `lib/tag.test.ts` — French garment nouns, outerwear, 7 new tests

## Notes / follow-ups
- `npm run lint` fails on `app/page.tsx:129` (`<a href="/contact?topic=seal">` should be
  `<Link>`). **Pre-existing and unrelated** — that file has no uncommitted changes, so CI
  lint is red on `main` independently of this work. One-line fix, not made here.
- Only one French brand exists. If more are added, revisit the `robe` decision — the
  arithmetic that made it not worth it changes as French rows grow.
