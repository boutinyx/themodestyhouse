# /edits/[slug] — the shoppable edit, and Everyday Lace
**Date:** 2026-08-24 · **Status:** done (page live in the build; hero image is a placeholder)

## Goal
I had proposed a written explainer. Tina, with the aabcollection.com hero screenshot
("The Art Of Summer / HIGH SUMMER 2026 / SHOP NEW IN"): *"this is for a normal blogpost
what i was talking about more was something like this"*. Then, on the lace one:
*"its going to be only items and maybe somewhere an explanation how you can style it but
mostly items"*.

So an **edit** here is not editorial. It is a campaign hero on top of a shoppable grid.

## Why this matters beyond layout
An edit page is a **collection page**, and that decides which queries it can win. Checked
on the day: the SERP for `lace hijab` is entirely product and collection pages (Bella
Hijabs, Vela, Mariam's, Etsy, Modefa) and `modest dress` is retailer collection pages plus
Wikipedia. **No article can rank for either.** A page of this shape can. That is the whole
reason this is a route and not a fourth blog post.

## What was built
**`lib/edits.ts`** — edit definitions, data-driven like `LANES`. Slug, title, eyebrow, dek,
hero, SEO title/description, a styling block, and a `match` predicate over the catalogue.

- A **predicate**, not a hand-listed set of ids: the catalogue turns over nightly via
  `refresh.yml`, so a hand-listed edit rots silently the first time a brand delists.
- `NOT_A_GARMENT` strips the accessory false positives a bare fabric-word match pulls in —
  the same class as §10.10. Verified against real titles ("Velvet Cap Grip", an AUD11
  undercap grip; "Leather Cap with Embroidery Detail").
- **Contains no runtime import.** `Product` is a type-only import and `productsForEdit`
  lives in `lib/products.ts` instead. `components/Footer.tsx` imports the edit list to
  link them, and Footer is a server component *today* — Invariant 10 exists precisely
  because that changes later. The definitions are client-safe by construction.

**`app/edits/[slug]/page.tsx`** — hero, grid, styling block, in that order.

- `data-hero` on the hero section, so `Header` goes transparent over it exactly as on the
  homepage. Without it the header stayed solid parchment and simply covered the top ~88px
  of the photograph — verified by screenshot both ways.
- `marginTop: calc(-1 * var(--header-height))` slides the photo under the sticky header.
- Reuses `encodeCatalogue` + `FilterableGrid`, so this is the compact columnar payload,
  not 428 fat `Product` objects (§8).
- JSON-LD `CollectionPage` lists only the 24 rows the grid actually paints.
- Breadcrumb is deliberately **two** crumbs. There is no `/edits` index page, and a
  breadcrumb pointing at a 404 is worse than a short one.
- Hero has no `srcset`: `lib/staticImage.ts`'s editorial variants are 400w and 900w, both
  far too small for full-bleed. The 1696x960 original is served directly.

**`app/sitemap.ts`** — edits added **in the same change as the route**, which is the only
reliable defence against the §8 trap this file's own header describes.

**`components/Footer.tsx`** — every live edit linked under Editorial. A sitemap entry gets
a page crawled; internal links are what pass ranking signal.

## The one invariant deviation, made loudly
CLAUDE.md **Invariant 5** says hijabs never appear in mixed grids. `Edit.includeHijabs`
is a per-edit opt-in that defaults to **off**, and lace turns it **on**.

Excluding hijabs from a lace edit would remove the 41 lace hijabs — which are the cheapest
lace in the directory ($6.90) and therefore the entire evidence for the word "everyday" in
the title. An edit is a *theme*, which is the case the invariant did not anticipate; a
mixed clothing grid diluted by 3,000 scarves is still the thing it correctly prevents.
Reversible by deleting one line. **Tina should confirm or reverse this** — it is her
editorial rule.

## Verification
`npx tsc --noEmit` clean · `npx eslint` on all five changed files clean · `npm run build`
compiled · `npm test` 1,323 passed (the 2 failures are another session's worktree).

Served on :3255, Playwright at two widths, stylesheet asserted loaded first:
```
/edits/everyday-lace          -> 200
sitemap total                 -> 129   (/edits/ entries: 1)
footer links it               -> yes
<title>  Everyday Lace — Lace Hijabs, Abayas and Dresses | The Modesty House

desktop 1440   h1 "Everyday Lace"  hero 1440x558  cards 24  overflow false
phone    390   h1 "Everyday Lace"  hero  390x523  cards 24  overflow false
count line: "428 pieces · 51 houses"   styling h2 renders after the grid
```
428 pieces / 51 houses: abaya 160 · dress 92 · top 72 · hijab 41 · skirt 38 · trousers 13
· set 11.

## Follow-ups
1. **The hero is a placeholder** — `public/editorial/lookbook.jpg`, reused so the page is
   shippable today. It is not a lace photograph. A real one goes in `public/` under a
   **new** filename (§6/§10.21: `public/` is cached 4h and unfingerprinted), through
   `node scripts/optimise-images.mjs`, then wire a srcset.
2. **The three styling paragraphs are mine, not Tina's.** She asked for a styling
   explanation so writing one was in scope, but §10.18 means her site's voice is hers —
   these are placeholders to be replaced or cut.
3. No `/edits` index page yet. Worth one when there is a second edit; the breadcrumb has a
   note where the middle crumb goes.

---

## Hero aspect ratio — measured off aab, not guessed (same day)

Tina: *"lokoing at aabs on dektop they have 16:9 and phone something around 3:2?? size for
the hero"*. The hero had been a `min-height: clamp(420px, 62vh, 620px)`, which is a height,
not a shape.

Rather than take either of our readings, aabcollection.com was measured directly with
Playwright:

```
viewport 1440 -> hero 1440x806  = 1.787
viewport 1920 -> hero 1920x1075 = 1.786     i.e. 16/9 (1.778)
viewport  390 -> hero  390x624  = 0.625     i.e. 5/8, PORTRAIT
```

Her desktop read was exactly right. **The phone is not 3:2 and not landscape** — it is
portrait, and at 0.625 it is a little taller than 2:3 (0.667). Implemented as measured:
`5/8` below 768px, `16/9` at 768px and above, in a new `.edit-hero` rule in globals.css
(inline styles cannot carry a media query, and these are two different shapes rather than
one shape at two sizes).

### Three things this took, each caught by measuring rather than looking

1. **`width: 100%` is load-bearing.** With `aspect-ratio` + `max-height` and `width: auto`,
   once the cap clamps the height the browser resolves the WIDTH back through the ratio.
   Measured at 1920: **1766x994 instead of 1920x1080** — 154px of bare background beside a
   "full-bleed" hero.
2. **The desktop `max-height` was removed.** A 92svh guard clamped 1920x1080 to 1920x994
   (ratio 1.93) when the reference is a true 1920x1075. 16:9 is never an absurd height, so
   it needs no guard. The mobile cap stays: 5/8 at a 767px-wide phone computes a 1227px
   hero.
3. **The WebKit run initially rendered with no CSS** — §10.24 and §10.26 rule 3, in my own
   throwaway probe, again. WebKit honours HSTS and `upgrade-insecure-requests` over
   plain-http localhost; the probe now strips both, exactly as `scripts/mobile-audit.mjs`
   already does.

### Verified, both engines
```
                 chromium                          webkit
desktop 1440     1440x810   ratio 1.778            1440x810   1.778
wide    1920     1920x1080  ratio 1.778            1920x1080  1.778
tablet   768      768x432   ratio 1.778             768x432   1.778
phone    390      390x624   ratio 0.625             390x624   0.625
```
h1 inside the hero box at every width, no horizontal overflow from the hero.

### One thing found and NOT fixed
WebKit reports 12px of horizontal overflow at 768 (`scrollWidth` 780 vs 768). It is
**not** the hero and **not** the brand band: it reproduces identically on `/`, `/directory`
and `/modest-dresses`, and hiding the band leaves it at 780. My first probe blamed
`.marquee-row`, which was a false positive of the same kind as §10.26 point 2 — the row is
39,487px wide by design inside an `overflow: hidden` parent, so its rect is huge while
being fully clipped. A rect is not evidence of overflow.

Pre-existing and site-wide; `npm run audit:interaction` was already reporting
`HORIZONTAL OVERFLOW` at tablet-819 in WebKit before any of today's work. Left open
deliberately rather than chased here.

---

## "lace-up" is a fastening, not the fabric — 57 pieces removed (same day)

Tina described the types of lace item she expects ("belts... tops which are most of the
time just strap dresses... and then the normal things like dresses and tops... also lace
hijabs"). Checking whether the catalogue actually holds them surfaced a defect in the
edit's own filter.

`/\blace\b/i` matched **57 of 428 pieces (13%) that contain no lace at all**:

```
Lace-Up Corset Cotton Shirt in Butter Yellow      (cotton poplin)
Lace Up Back Tencel Maxi Dress - Denim            (tencel)
Eyelet Lace Up Maxi Dress - Cerulean
```
Spread across nine houses — Veiled 21, Mariam's 13, Nihan 7, Esme New York 4, ByHasanat 4.

"Lace-up" is a drawstring. This is **CLAUDE.md §10.10** exactly — a keyword match is
evidence FOR a category, never proof — and §10.11's rule that a heuristic over third-party
text gets its negative case tested at the moment it is written. I shipped this one the
same hour I wrote it and did not test the negative case; it took Tina asking an unrelated
question about item types to expose it.

Fixed with a `LACE_UP` exclusion. **428 → 371 pieces, 51 → 49 houses.**

```
abaya 149 · dress 63 · top 62 · hijab 40 · skirt 37 · set 10 · trousers 9 · swim 1
lace-up remaining: 0
```

## The item types Tina expected, against what exists
| she described | in the catalogue |
|---|---|
| belts, long enough to wear as a mini skirt | **0.** The only hit is BAQA's "Cord Belt Detailed Lace Blouse" — a blouse. |
| tops that are really strap/slip dresses worn under a blazer | **2.** Modesty in Style's "Cami Lace Top", one Mariam's sleeveless-dress set. |
| normal dresses and tops | **125** — 63 dresses, 62 tops. |
| lace hijabs | **40**, 11 houses, from $6.90. |

Two of the four categories she reaches for are effectively absent. Reported rather than
written around — the same shape as the pashmina gap in the trend research (fastest-growing
term in modest fashion, nineteen pieces).
