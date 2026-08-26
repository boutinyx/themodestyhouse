# Editorial: "Where to Buy Hijabs Online, and What You'll Actually Pay"
**Date:** 2026-08-26 · **Status:** done

## Goal
Publish the #1 piece from the Search Console + Trends research
(`docs/log/2026-08-26-editorial-topics-from-search-console.md`): a data-backed hijab
buying guide in the same format as `best-abaya-brands-price-tiers`, which reached
position 2.2 within a week of publishing.

It targets the query cluster the site already receives impressions for — `hijab store
online` (15), `online hijab store` (12), `hijab stores online` (11), `hijabs online`,
`buy hijab` — plus the rising Trends modifiers `instant hijab` +110%, `modal hijab`
+50%, `hijab boutique` +60%. Those modifiers are why the fabric and instant sections
are in the same piece rather than a second one.

## What changed
- **`content/editorial/where-to-buy-hijabs-online.md`** — new post. ~1,400 words,
  8 sections: four price bands, a fabric ladder, instant hijabs, undercaps, and a
  closing summary. Cover is the existing `/editorial/lookbook.jpg` (a stack of folded
  plum satin with one length draped) — already has its WebP variants on disk, so
  `lib/staticImage.test.ts` stays green. No new image was generated.
- Nothing else. No code touched.

**One deliberate departure from the abaya post's pattern:** house names link
*internally* to `/designers/<slug>`, and only the example products link out. The abaya
post linked house names to their homepages. The designer pages are the best-ranking
pages on the domain (Glow Modesty 6.8, Inayah 9.9, Veiled 15.1) and §8 records that
internal links, not sitemap entries, are what pass ranking signal — so the editorial
should feed them. Result: 23 internal `/designers/` links and 24 outbound product
links on one page.

## Every number in the piece, and where it came from
All computed over `data/products.json` (20,056 rows), prices converted to USD via
`data/fx-rates.json` (base USD, fetched 2026-08-25), medians per house.

- 5,046 hijabs across 75 houses; house medians $2.32 (Nurmirè) to $95.66 (Maison Hijab).
- Fabric medians are **scarves only** — caps, undercaps, underscarves, bonnets and
  inners excluded, because they drag the numbers: raw `cotton` reads $4.29 only because
  134 of its 248 pieces are caps. Scarves-only: georgette $10, chiffon $10.7, modal $16,
  satin $19.8, jersey $20.7, bamboo $21.8, silk $29.2.
- Undercaps and inners: 613 pieces, 30 houses, median $8.
- Instant / slip-on / ready-to-wear: 142 pieces, 18 houses, median $19.
- 1,451 of 5,046 titles name no fabric at all. Stated in the piece as a limit.

## Verification
- `npx tsc --noEmit` — exit 0 (after `rm tsconfig.tsbuildinfo`).
- `npm test` — **48 files, 791 tests passed**.
- Internal links checked programmatically against `brandPageSlugs()` and `LANES`:
  **21 unique internal links, 0 broken.** Every named house clears the 24-product
  `MIN_PRODUCTS` threshold for a `/designers/` page except Nurmirè (17 products), which
  is therefore linked to its homepage instead.
- All **24 external links return HTTP 200** (curl, following redirects, browser UA).
- Rendered against the running dev server: HTTP 200, 8 `<h2>`, **0 leaked markdown**
  (no stray `**[`, `](`, or `##` in the HTML), 23 `/designers/` links, 24
  `rel="noopener noreferrer sponsored"` outbound links, cover image present.
- Screenshotted at 1440 and 390 with Playwright and looked at.

## Claims I had to correct before shipping
The first draft carried six plausible-sounding statements I had not measured. Listing
them because the pattern is §10.33 exactly — an assertion that reads like a finding:

1. "Nasiba, the **second**-largest hijab catalogue" — it is the **largest** (395),
   Losyana second at 394.
2. "Above $30 there are **four** houses" — there are **five** with ≥20 pieces. NOUREEN
   Modest Fashion (Antwerp, 53 hijabs, median $31.49) was missing entirely.
3. "Losyana, **weighted towards instant styles**" — 10 of its 394. Removed.
4. "A jersey costs **about twice** a chiffon at the same house" — checked properly
   across the 12 houses stocking ≥5 of each: jersey is dearer at 8 of 12, median ratio
   **1.20**, and Modern Hijabi runs the other way. Rewritten as measured.
5. "Chiffon, the **cheapest** of the real fabrics" — georgette is cheaper ($10 vs $10.7).
6. "iLoveModesty, **mostly chiffon and modal**" — chiffon 62, satin 36, modal 21, and
   154 of 291 name no fabric.
   Also "Modern Hijabi, sold as **sets rather than singles**" — 37 of 120.

Each was fixed by measuring rather than softening.

## Notes / follow-ups
- **This post is now the homepage feature.** `getPosts()` sorts by date descending and
  `app/page.tsx` renders the newest as the feature slot, so publishing it displaces
  `best-abaya-brands-price-tiers` there. Verified on the dev render. Expected, but it is
  a homepage change as well as a new page, so worth saying out loud.
- It enters `sitemap.xml` automatically — `app/sitemap.ts` maps posts, with
  `lastModified` from the frontmatter date (fixed 2026-08-09).
- Piece two, per the research: the British modest houses (~25 of 113 brands;
  `modest clothing uk` rising +140%). Not started.
- **Verified on staging** at
  `https://themodestyhouse-staging-production.up.railway.app/editorial/where-to-buy-hijabs-online`
  (commit `3609f9b`): HTTP 200, 8 `<h2>`, 23 `/designers/` links, 24 sponsored outbound
  links, no leaked markdown, canonical correctly points at the production host, and the
  response carries `x-robots-tag: noindex, nofollow, noarchive`. Present in staging's
  `sitemap.xml`, and leading the homepage feature slot. Screenshotted at 1440 and 390
  and looked at. `npm run build` was NOT run locally — another session holds
  `next start` on :3211 and `next dev` on :3000 off the shared `.next` (§10.28 rule 4);
  the Railway build is the one that was reviewed, which is the point of the protocol.
- Awaiting Tina's approval to merge `staging` → `main`.


---

# Rewrite on corrected data
**Date:** 2026-08-26 · **Status:** done

The first version was built on prices that were in the wrong currency for 31 brands
(`docs/log/2026-08-26-currency-mislabelling.md`) and named a house that had since been
cut. Rewritten after the fix and re-ingest.

## What changed in the piece
- **Every figure recomputed.** Catalogue is now **4,980 hijabs across 74 houses**
  (was 5,046 / 75 — Mariam's Collection was cut from the directory in `d58b224`).
  The range is **$6.34 to $80.49**, not $2.32 to $95.66.
- **The whole "Under $10" band changed hands.** Nurmirè ($2.32 → $21.06) and Hidayah
  ($3.12 → $18.72) were never budget houses; they are $19–21 houses and now appear in
  the middle and upper bands. The real floor is Modest & Timeless $6.34, Store WF
  $6.82, Zahraa $7.50.
- **Mariam's Collection removed** — it led the $10–20 section and carried two product
  links. Gone, along with its designer link.
- Other movements: Nasiba $10.73 → $15.11, Jaida $16.62 → $23.27, MERRACHI $54.83 →
  $33.83, Maison Hijab $95.66 → $80.49, Hawaa and Klay both to $19.77.
- **Fabric ladder recomputed**: georgette $10, chiffon $15, modal $19, satin $20,
  jersey $22, bamboo $26, silk $32. Crinkle and plain cotton sit outside it at $9.
- Instant hijabs are now 123 pieces / 15 houses / $23 median (was 142 / 18 / $19);
  caps 590 / 30 houses / $7.50 (was 613 / 30 / $8).
- Added a dated-prices note at the end. Prices are read from live listings and shops
  move them, so the piece now says which day it was measured.

## Claims that did not survive re-checking
Four, caught the same way as the first round — by measuring rather than rereading:
1. *"MERRACHI's catalogue is bigger than the other four put together, three times
   over"* — it is 378 against 238, i.e. 1.59x. Now "more hijabs than the other four
   put together."
2. *"The cheapest ready-to-wear is Nasiba's Slip On at $15"* — Veiled's Amira Bamboo
   Jersey Instant is **$12**. Both are now named, in order.
3. *"eleven fabrics against five to seven for its neighbours"* — Vela has eight.
   Corrected to "five to eight".
4. Nasiba's Slip On is no longer called "the cheapest", only "one of the cheapest".

## Verification
- Internal links: **26, 0 broken** (checked against `brandPageSlugs()` and `LANES`).
- External links: **all 27 return HTTP 200**.
- Rendered: HTTP 200, 8 `<h2>`, 26 `/designers/` links, 27 sponsored outbound links,
  0 leaked markdown, no "Mariam" anywhere, `$2.32` gone, `$6.34` present.
- Re-verified against the data: Veiled 106 of 283 chiffon · Nour Al Houda 110 sets,
  the most of any house · AbayaButh 11 fabric words · Zahraa the tightest range of any
  house over 100 pieces (3.2x) · Haute Hijab 62 pieces at $20 and 33 at $25 · Hidayah
  the only DKK house in `data/brands.ts` · 15 houses stocking an instant style.

## Notes / follow-ups
- **The prices will shift again, legitimately.** These were read from an EU-served
  refresh; tonight's US CI run fetches US-market prices for the same products, which
  can differ by 15–25% on some houses. The currency label will be right either way,
  but the figures in the piece are a snapshot — which is why it now says so.
