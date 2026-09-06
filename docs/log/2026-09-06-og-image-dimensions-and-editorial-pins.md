# Instagram previews, and keeping a featured product in the catalogue

**Date:** 2026-09-06 · **Status:** on staging, awaiting Tina's approval to merge

## Goal

Tina: *"i want the ones i in the picture to be still in the catalogue and i wnt to be able
to grab the link and put the product in my instagram which doesnnt work rn."* Two of her
own flat-lays, four garments between them. One symptom, two unrelated causes.

## Cause 1 — the size floor, working exactly as designed

The Aab *Pinstripe Maxi Shirt Navy* she had used left the catalogue overnight. Not
delisted, not out of stock, `decisions` still `keep`: **Aab is down to XXL only**, and
Tina's own 2026-08-28 rule withholds a product once the smallest in-stock size is XL or
bigger. `onlyLargeSizesLeft(p.raw.sizes)` returns `true` for it.

**213 other products are currently in the same state.**

Worth recording because I got there twice by guessing and once by measuring. My first probe
called `onlyLargeSizesLeft(row)` and got `false`, which read as "not the size rule" — the
function takes `p.raw.sizes`, not the row. Passing the right argument, with a known-positive
and a known-negative control alongside, gave `true`. **A single call with no control is not
a measurement** (§10.2's shape: verify that results DIFFER between inputs before trusting
either).

**Fix:** `sizeFloorAllowIds` in `data/exclusions.json` — editorial pins, exempt from that
ONE rule. The check sits immediately before the size floor in `verdict()`, deliberately not
at the top, so a pin can never resurrect something a brand blacklist, an id exclusion or the
price ceiling has already rejected, and it does nothing for a delisted or out-of-stock row.
Sits beside the existing `nonApparelAllowIds` escape hatch, which is the same shape.

## Cause 2 — no `og:image` dimensions

Everything else about sharing was already right, and was verified rather than assumed:
requesting the page as `facebookexternalhit` and as the Instagram app returned 200 with
correct `og:title`/`og:image`, the bot-scoped noindex (§8) does not touch preview crawlers,
and the image itself fetched fine as Facebook (200, 159 KB, `image/jpeg`).

What was absent was `og:image:width` / `og:image:height`. Without them a crawler has to
download and measure the image before it can lay the card out, and Facebook/Instagram
commonly render the first share with no image at all.

`socialCardImage()` (`lib/shopifyImage.ts`) asks the Shopify CDN for an exact **1200x1200**
box and declares those numbers.

**Why square, decided by looking rather than by reasoning.** All four candidates were
generated from a real product photograph and compared side by side:

```
1200x630  crop=center   a horizontal band of fabric — no garment shape left
1200x630  crop=top      the model's face; the product is out of frame
1200x1200 crop=center   whole garment, head slightly cropped     <- chosen
1200 natural (1200x1799) the best image, but its height is unknowable at build time
```

The natural portrait is the nicest image and is what the PAGE still renders. It cannot be
the social card because nothing stores the source aspect: the Shopify feed exposes
`images[].width/height` but raw rows do not carry them, and adding them would need a full
re-scrape (§10.12) for a metadata tag. `height` is only honoured alongside a crop mode —
without `crop` Shopify returns the natural aspect and the declared numbers become a lie.

Non-Shopify images (the WooCommerce brands) return **no** dimensions rather than guessed
ones. A wrong `og:image:height` is worse than none, because the crawler trusts it and lays
out to it.

Twitter drops from `summary_large_image` to `summary`, since the large card is specified as
2:1 and would crop a 1:1 image back down to the band this change exists to avoid.

## Verification

All on staging (`https://themodestyhouse-staging-production.up.railway.app`), against
production as the control.

```
og:image:width/height    staging 1200x1200        production absent      <- discriminator
declared vs ACTUAL bytes shopify   1200x1200 = 1200x1200   MATCH
                         pinned    1200x1200 = 1200x1200   MATCH
                         woo       none      = 1707x2560   MATCH (declares nothing)
pinned product page      staging 200, renders, natural portrait image, Shop at Aab
size floor still applies 213 non-pinned withheld, 0 leaked · 1 of 1 pin published
suite                    1143 tests pass · tsc clean · lint clean
```

**Marker discipline (§10.47 rule 3):** the obvious marker — the pinned product's page
returning 200 on staging — was **not** a discriminator. Staging already served it, because
staging's previous build predated the nightly that dropped it. `og:image:width` was absent
on both sides beforehand and is the marker that was actually used.

**Negative controls run before trusting anything:** the three new pin guards in
`lib/exclude.test.ts` were run against a deliberately malformed pin, a blocklisted-brand
pin and an unpublished pin; all three fired. The `it.skipIf(process.env.CI)` on the
"actually published" one is §10.19 — `products.json` is rewritten nightly by a bot, and a
brand genuinely delisting a pinned product is news for Tina, not a red build.

## Notes / follow-ups

- **A pin is a hand-written id in a JSON file with no compiler behind it** — §10.54's exact
  shape, where twenty such ids silently stopped resolving after a brand changed domain. The
  guards are why that will now fail loudly instead.
- Not fixed, and worth knowing: **Instagram renders no link preview in a post caption or a
  Story link sticker at all**, by design. This change helps every OG consumer — her
  link-in-bio tool, DMs, WhatsApp, Pinterest, Facebook — but if the surface she means is a
  caption, no metadata can produce a preview there.
- `eslint.config.mjs` now ignores `.scratch-*/`, matching the `.gitignore` rule from
  `05eea64`. Lint is a CI job and a warning from a throwaway directory reads as a site
  regression.
