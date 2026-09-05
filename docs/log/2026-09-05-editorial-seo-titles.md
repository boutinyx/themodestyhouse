# A post can have a headline and a different `<title>` — and "abayas under $100" was the wrong query to chase
**Date:** 2026-09-05 · **Status:** done

## Goal

Tina, on the new abayas post: *"good can we use a differnt title for seo, or do something
better for seo?"*

The literal answer was no — `app/editorial/[slug]/page.tsx` set `title: p.title`, so a post's
`<title>`, its `<h1>`, its OpenGraph title and its Article-schema headline were all one
string. Wanting a different one for search required a code change, not an edit.

## The finding that mattered more than the mechanism

The two candidate queries have **completely different SERPs**, checked rather than assumed:

| query | what actually ranks |
|---|---|
| `abayas under $100` | Aab, Vela, Veiled, Etsy, Amazon, Walmart — **shop collection pages, top to bottom.** Aab's result is literally its "Shop Under $100" filter. |
| `affordable abayas that look expensive` | CAS Abaya's "Top 10 Affordable Abayas That Look Expensive", Amanis, Ayesha's Collection — **articles, top to bottom.** |
| `cheap abayas that look expensive` | Alibaba buying guides, Abayas Boutique's "What Makes an Abaya Look Expensive? A Quality Checklist" — articles again. |

**An article cannot win a transactional query.** Tina's headline targets `abayas under $100`,
which Google answers with product grids — so as a `<title>` it was competing for a result
slot that does not exist for it. The same post targeted at "affordable abayas that look
expensive" is competing against generic advice pieces while naming nine real, in-stock,
priced pieces with sourced construction detail. That is a winnable SERP.

The right page for `abayas under $100` is `/modest-abayas` with a price filter — a grid, like
every result Google already returns. Not built here; noted below.

**Search Console says nothing either way, and that is worth stating.** 28 days,
`sc-domain:themodestyhouse.com`, 693 queries with impressions. The whole
cheap/afford/price/under family is **6 impressions, 0 clicks**, none of them abaya-shaped.
That is not evidence the demand is absent — it is evidence we have never had a page aimed at
it, which is exactly what a zero looks like from inside a property with no such page (§10.38
rule 1). The SERPs above are the evidence; GSC is the baseline to measure against later.

## What changed

**`lib/posts.ts`** — optional `seoTitle` / `seoDescription` frontmatter, plus `seo(post)`,
one function so the fallback cannot be written twice and differently. A post that sets
neither behaves exactly as before.

**`app/editorial/[slug]/page.tsx`** — `<title>` and meta description take the override.
**OpenGraph and Twitter deliberately keep the headline**, because a shared link is read by a
person rather than ranked, and Article schema keeps it too, since its `headline` is supposed
to match the visible one.

**The post's frontmatter:**

```
h1 / OG   Abayas Under $100 That Don't Look Under $100        (44)
<title>   9 Affordable Abayas That Look Expensive | The Modesty House   (59 chars)
meta      Nine abayas from $36 to $54, and the four construction tells — hidden zips,
          real pockets, texture over shine — that give a cheap abaya away.   (140)
```

59 characters is inside what Google displays, which matters here because
`app/layout.tsx`'s `%s | The Modesty House` template costs 20 characters this file does not
control, and truncation eats the END — so an over-long title is one that loses the brand
name. Leading with a numeral matches the shape of the result currently ranking first.

**`content/editorial/best-abaya-brands-price-tiers.md`** — one clause added to its closing
line, linking to the new post. The two are now reciprocal. A sitemap entry gets a page
crawled; internal links are what pass ranking signal, and the new post had inbound links from
`/` and `/editorial` only.

## Verification

**`lib/posts.test.ts`** (new, 6 tests) — three over the fallback, three over the published
posts:

- every `<title>` that sets an override stays inside 60 characters INCLUDING the template
- every overridden description stays inside 160
- an override identical to the headline it replaces is a failure, not a no-op

**Negative controls, run before trusting any of them** (§10.28 rule 1). Fallback broken so a
title override blanks the description:

```
× uses the override when the post has one
× falls back per field, not all or nothing
```

An over-long `seoTitle` written into the real post:

```
× keeps every <title> inside what a SERP will display
  Tests  1 failed | 5 passed (6)
```

Both restored: `6 passed`.

**Suite 1110 passed** (1104 before, +6). `npm run lint` exit 0. `npx tsc --noEmit` clean apart
from the two pre-existing `.next/types/validator.ts` errors for the deleted `/directory`
route, dated Aug 29 — another session's stale build output.

## Notes / follow-ups

- **`/modest-abayas` is the page that should chase `abayas under $100`**, and it currently
  cannot: there is no price filter on a lane page. Every result Google returns for that query
  is a filtered grid, and Aab's is literally called "Shop Under $100". That is a real feature,
  not a copy change, and it is the bigger of the two opportunities here.
- **No other post sets an override.** The three older posts still take title and dek, which is
  correct — `where-to-buy-hijabs-online` is already query-shaped. Worth revisiting
  `best-abaya-brands-price-tiers`, whose headline is magazine-shaped and whose query
  ("best abaya brands") is one we get impressions for at position 12.
- The one clause added to Tina's price-tiers post is hers to rewrite; it exists to carry the
  link, and the link is the part that matters.
