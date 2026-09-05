# "Abayas Under $100 That Don't Look Under $100" — nine of Tina's eleven picks
**Date:** 2026-09-05 · **Status:** done (written and verified; not merged to main)

## Goal

Tina: *"i wanted a blog post abayas under $100 that dont look under 100"*, with eleven
product URLs.

## What changed

**`content/editorial/abayas-under-100-that-dont-look-it.md`** (new) — ~1,150 words, cover
`/editorial/mirror-selfie-abayas-3.jpg` (the only unused editorial image, and it is satin
abayas with gold lace trim, which is the article's subject). Nothing else touched.

The piece opens with four construction tells — shine instead of texture, no closures, no
pockets, nothing at the edges — and then every product entry names which of them that piece
has. **Every specific claim comes from the brand's own product copy**, fetched per product,
never from looking at a photograph and guessing (§10.18, §10.11).

## Two of the eleven were left out

**`avyaana:khaki-gem-faulty` — the product is literally titled `Khaki Gem (FAULTY)`.** It is
a seconds/damaged listing, and one size (54) remains. In an article arguing these pieces do
not look cheap, a piece the brand has labelled faulty is the one link that would discredit
the rest.

**`avyaana:peach-floral`** — one size left (56), and its entire product description is
*"Includes abaya and under dress only"*. There is no sourced reason to say it looks
expensive, and inventing one is the thing §10.18 forbids. Left out rather than padded.

Both are Tina's call to overturn; the post takes one line each to add back.

## Three things found while checking, worth more than the post

**1. Four storefronts served my Dutch IP euros while our catalogue holds dollars** — §10.44
exactly, still live and still invisible unless something compares the two:

```
avyaana       live 23.95 EUR | ours 28    USD   ✗ disagrees
lameera-moda  live 41.95 EUR | ours 40    USD   ✗ disagrees
ayaana        live 41.95 EUR | ours 48    USD   ✗ disagrees
vela          live 43.95 EUR | ours 49.99 USD   ✗ disagrees
jawda / losyana / aab                            ✓ agree
```

So the "live prices" a naive check reads from this machine are not the prices a US reader
pays. The post quotes the US-storefront figure for USD brands and the native currency for
the GBP/EUR ones, with a closing line saying prices move and differ by region.

**2. The size-floor rule is cutting a product that is buyable in S, M and L.**
`fares:8281648660671` (Floral Trim Pleated Abaya – Qahwa) is rejected with reason
`only-large-sizes`, so it is not published on our site at all. Today's nightly, run from a US
runner at 04:10, records `XS:n S:n M:n L:n XL:Y XXL:Y`. A live request from here, at the same
moment, returns `S, M, L, XL, XXL available`.

Not staleness — both reads are from today. It is a **regional inventory split**: the store
shows different availability by market, and §7's rule is being applied to whichever one the
US runner happens to see. Three Fares trousers are rejected for the same reason. Worth its
own investigation; the post links the piece directly, since it is buyable.

**3. A probe that reported 11 sold-out products out of 11.** The first stock check used
`/products/<handle>.json`, which **has no `available` field at all** — `v.available` was
`undefined` for every variant, so everything read as sold out, including an Aab piece with 35
variants. Eleven for eleven across eight unrelated storefronts is not a finding, it is a
broken harness (§10.26), and dumping one variant object settled it in one call. The endpoint
that does carry availability is `/products/<handle>.js`.

## Verification

**The post parses through the real module**, not by eye:

```
getPost('abayas-under-100-that-dont-look-it') -> parsed OK
title / dek / date / category / author / image all populated
body 6,768 chars · 11 headings
sitemap now carries 5 editorial posts
```

**Every link resolves and every price claim was re-read after writing:**

```
9/9 outbound product links      200
2/2 internal links on staging   200  (/modest-abayas, /editorial/best-abaya-brands-price-tiers)

27.95 GBP  available   Mist Blue Etched Crepe Lace Abaya
36.00 USD  available   Floral Trim Pleated Abaya - Qahwa      (was 90.00)
39.00 EUR  available   Farasha Abaya - pistachio
41.95      available   Aaira Textured Beaded Open Abaya- Mint
41.95      available   Reeh • Forest Green Abaya
43.95      available   Pomegranate Draped Kaftan
45.00 EUR  available   Ballon Abaya - dark lavender
52.00 USD  available   Ink Print Satin Kimono                 (was 104.00)
39.95 GBP  available   Pale Pink Cotton Blend Tassel Abaya
```

The two markdowns are from `compare_at_price`, not from a description — Aab's listing is
tagged `50%_off` and `further_reduced`, and Fares' is tagged `FINAL SALE`. They are the
article's best evidence for its own premise: both pieces were *designed* above $90.

**Suite:** `1104 passed`. **Links are plain URLs**, matching the sibling price-tiers post —
editorial prose is deliberately exempt from `withUtm()` (§6, `components/Markdown.tsx`).

## Unrelated, and good: the CI translation fix worked on its first night

Merging `origin/main` brought `4ad1322`, the 04:10 run — the first since yesterday's change.
The runner translated on its own, with no venv and no human:

```
+"Oberteil mit Schaldetail": "Top with scarf detail"
+"Poncho - Schwarz": "Poncho - Black"
+"Nala Zweiteiler": "Nala two-piece"
   … 18 lines of new cache entries, committed by the bot
data/refresh-report.json  untranslatedTitles: 0
```

## Notes / follow-ups

- **The real range is $36–$54, not "under $100".** Every piece Tina picked is under $55, so
  the headline undersells by nearly half. "Under $60" is a sharper and equally true claim.
  Her title, so it stands unless she says otherwise.
- **Outbound links in editorial prose carry no UTM.** Correct per §6, but this is a shopping
  roundup: nine brand links whose referrals will read as direct traffic in the brands' own
  analytics. Worth deciding deliberately rather than inheriting the rule.
- Sizes at this price move fast. Three of the nine had two or fewer sizes left in the US view
  when written; the closing line says so rather than pretending otherwise.
