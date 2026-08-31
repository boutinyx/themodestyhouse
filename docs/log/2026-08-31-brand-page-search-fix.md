# "merrachi" — what Search Console actually said, and what changed

**Date:** 2026-08-31 · **Status:** done

## Goal

Tina: *"check google console we can be on number 1 page on search 'merrachi' and
i want you to fix that"*.

## What the data said, before any theory (§10.38 rule 1)

```
query "merrachi", 1 Jul – 31 Aug          impressions 319   position 6.5   clicks 0
  page:  https://themodestyhouse.com/designers/merrachi     (the only page ranking)
  first impression 2026-08-26, then 122 / 129 / 65 per day
  mobile 265, desktop 51
URL inspection: PASS · "Submitted and indexed" · crawled MOBILE 2026-08-26 11:28Z
```

**We are already on page one.** Position 6.5 for the house's own name, off three
days of data, on a page Google found, crawled and indexed without complaint. The
thing that is broken is not the ranking, it is that **319 impressions produced
zero clicks**, and that is a different repair.

Two more facts came out of the same look, and both are worth more than the
Merrachi question on its own:

- **The pattern is site-wide.** 54 designer pages have impressions; almost all
  sit at position 6–11 with 0–1 clicks. `/designers/merrachi` is simply the
  biggest (402 impressions across all queries).
- **`/designers/merrachi` had ONE internal link on the entire site** — from
  `/designers?page=2`. The homepage renders zero designer links in its HTML, and
  page 1 of the index links 27 houses, not this one. Google reached the page
  through the sitemap; nothing on the site passed any authority to it.

## What changed

**1. The two lines Google prints.** At position 6 the snippet is the only lever
left. Both were derived from a template that told a searcher nothing they did not
already know — the title read "MERRACHI — Modest Fashion Brand" to someone who
had just typed *merrachi*.

```
before  MERRACHI — Modest Fashion Brand | The Modesty House
        MERRACHI (Amsterdam) — 1,021 pieces listed in The Modesty House
        directory, with prices and links to the house's own store.

after   MERRACHI — 1,021 pieces & prices | The Modesty House
        Every MERRACHI piece we track: 1,021 items, €23–€177. Based in
        Amsterdam. Prices in your own currency, checked nightly, with links
        straight to bymerrachi.com.
```

Every number in it is measured from the house's own rows, so no page can claim
something the catalogue does not hold (§10.18).

**2. Content the page did not have.** Its own words were an `h1`, four `dt`
labels and a button. It now carries four measured sections — *What MERRACHI
makes* (the full garment breakdown), *MERRACHI prices* (range and median),
*Where to buy MERRACHI* (city, storefront, that we sell nothing), and *More
houses in Europe*. The headings deliberately carry the modifiers Search Console
already shows alongside the name: `merrachi clothing`, `merrachi store`,
`merrachi amsterdam`, `merrachi canada`.

**They render BELOW the product grid**, which is where `lib/laneAnswers.ts`
already puts the same shape of content on every lane. Above the grid they pushed
the first photograph 600px down the page, and the person who arrives on a brand
page came to see clothes.

**3. Internal links, which the page had almost none of.**

- Each brand page now links to eight sibling houses in its region — as a **ring**
  starting at its own position, not the first eight alphabetically, so the 89
  pages link to each other evenly instead of all pointing at Aab. Deterministic,
  so the link graph does not churn between builds.
- **`app/page.tsx` gated its internal link on `b.description`** — the gate
  `/designers/page.tsx` dropped on 2026-08-26 when brand pages stopped requiring
  a hand-written description. Its comment still claimed the two matched. So the
  highest-authority page on the site was linking 84 houses that have real pages
  of ours straight out to their storefronts. Now `hasBrandPage()`, like the index.

**4. `sameAs` on the Brand schema.** `url` is a property of our claim; `sameAs`
is an identity statement — this page is about the entity that owns
bymerrachi.com. It is the field a brand-name query is resolved against. Only the
storefront is asserted, never a guessed social profile.

## What this can and cannot do

**It cannot make us #1 for "merrachi".** Positions 1–5 for a brand's own name
belong to the brand: its storefront, its sitelinks, its Instagram, its TikTok.
An aggregator does not take those, and any plan that promises it is selling
something.

What is realistically available: a snippet that gives a reason to click at
position 6 (0% → a few per cent is 5–15 clicks a month at the current 319, and
the same template change applies to all 54 ranking designer pages), a position
that can improve a place or two on relevance and internal links, and the modifier
queries — `merrachi dresses`, `merrachi store`, `merrachi amsterdam` — where the
house's own site is thin and a complete priced catalogue genuinely is the better
answer.

**Nothing here is verifiable today.** Ranking and CTR move when Google recrawls
and re-serves, over days. The honest check is the same Search Console query in a
week; the numbers above are the baseline to compare against.

## Verification

```
npx tsc --noEmit                       → exit 0
npx eslint app components lib scripts  → exit 0
npm test                               → 1033 passed, 1 failed (everyday-lace,
                                          pre-existing and red on main)
npm run audit:outbound                 → ALL PASS, both engines
```

Rendered and read at 1280 and 390 before and after moving the block, since this
changes what 89 of Tina's pages look like. Checked on three houses that the
derived strings are right for different currencies and shapes: MERRACHI
(€23–€177, Amsterdam), Niswa Fashion ($5.99–$345, Los Angeles), Jawda
(£9.95–£52.95, London). The ring was confirmed to differ per page — Jawda's
neighbours include Merrachi, Niswa's do not.

## Follow-up

- **A hand-written `description` for the top houses is the biggest remaining
  lever, and it is Tina's to write.** The template renders it in place of the
  derived facts and it is the one thing on these pages a competitor cannot
  derive. MERRACHI, AbayaButh, Jawda, Glow Modesty and Hawaa are the five with
  the most impressions.
- Re-run the Search Console query in a week against the baseline above.
