# A Meta product feed, so products can be tagged on Instagram

**Date:** 2026-09-06 · **Status:** shipped to production; catalogue created and ingesting

## Goal

Tina pasted a product URL into Instagram and got
*"geen overeenkomst gevonden — dit product kan niet worden toegevoegd op Instagram,
probeer een andere product url."* Then: *"do what we need to do."*

## What that error actually is, and what it is not

It is **Instagram Shopping product tagging**. When a URL is pasted there, Instagram does
not fetch the page at all — it looks the URL up in a **Meta Commerce catalogue** attached
to the account. There is no catalogue, so no URL from this domain can ever match.

**This is worth stating plainly because I had already "fixed" the wrong thing.** Earlier
the same day I shipped `og:image:width`/`height`
(`docs/log/2026-09-06-og-image-dimensions-and-editorial-pins.md`) on the strength of Tina
picking "Instagram shows no preview" from my own list of options. That fix is real and
stands — it fixes link previews in her bio tool, DMs, WhatsApp and Pinterest — but it was
never going to touch product tagging. The list I offered did not contain the right answer,
so the answer she gave could not be right either.

## What was built

**`lib/metaFeed.ts` + `app/meta-catalogue.xml/route.ts`** — RSS 2.0 with the Google
Merchant namespace, which Meta ingests directly. Fields, required set and formats were
read from Meta's published spec, not recalled.

- `link` points at **our** `/product/...` page, not the brand's. Meta requires the link to
  sit on a domain the catalogue owner has verified, and a tapped product tag has to land
  somewhere we control.
- `price` is `43.00 USD` — the row's own currency, never converted (Invariant 15).
- `image_link` requests `width=1200`, clearing Meta's 500x500 minimum on both axes.
- `google_product_category` maps each of the eight published garments. An abaya is filed
  under *Traditional & Ceremonial Clothing*, not *Dresses*; an unmapped garment falls back
  to the parent category rather than guessing a leaf, because a wrong leaf is what gets a
  product rejected.
- Prerendered statically with `revalidate = 3600`, so the 15 MB document is not rebuilt per
  request. Not in `app/sitemap.ts` and linked from nowhere — it is a machine endpoint.

**Open Graph product tags on the product page.** Meta crawls the landing page of every
catalogue item and compares the price and availability it finds against the feed; a
mismatch can get the product rejected or the shop deactivated. Both sides now read the same
`Product`, so they agree by construction.

**Why OG product tags and not schema.org Product JSON-LD.** `lib/schema.ts` opens with a
standing decision — *"Product-level JSON-LD is deliberately NOT here"* — because stale
prices in structured data risk a Google **manual action**
(`docs/launch-readiness.md`). That reasoning is entirely about Google and rich results.
Meta reads its own `product:` OG tags, Google does not use them for rich results, and this
page is `noindex` to googlebot anyway. So Meta gets what it needs and the recorded decision
is left standing rather than argued around.

They are rendered in the component, not in `generateMetadata`: Next's `openGraph.type`
union has no `'product'`, and its `other` field emits `name=` where the OG protocol
specifies `property=`. React 19 hoists them into `<head>` — verified in the served HTML
rather than assumed.

## Deliberately not included

- **`size`.** Meta lists it as conditionally required for apparel Shops. Sizes live on the
  raw row (`raw.sizes`), are stripped at publish, and `lib/rawData.ts` is gated to local dev
  (Invariant 11) — so the feed cannot see them. If Meta's review asks, the fix is a
  published sidecar, not reading raw at request time.
- **`sale_price`, `item_group_id`.** We hold neither. `lib/colorVariants.ts` could group
  colourways later; a wrong grouping is worse than none.

## Verification

```
full feed generated and PARSED with a real XML parser   19,172 items, 15,037,426 bytes
items missing any required field                        0
control: parser fed a deliberately malformed file       rejected ("unbound prefix")
served from a real `next start` build                   200, application/xml, 19,172 items parsed
product page OG tags in the served HTML                 all 6 product:* present, property=
suite / lint / tsc                                      1169 pass · clean · clean
build                                                   /meta-catalogue.xml prerendered, 1h revalidate
```

The unit tests cover the shape on every commit (required fields present, `43.00 USD`
formatting, non-USD preserved, 200-char truncation, ampersand escaping, illegal XML control
characters stripped, unique ids). The genuine parse covers the bytes before a deploy — there
is no XML parser in this project's dependencies and adding one for a test was not worth it.
The test comment says exactly that, because it originally claimed "a real parser, not a
regex" while using regexes, which is the kind of false explanation §10.43 says is worse than
no code at all.

## What this does NOT do, and Tina has to decide

The feed is necessary and not sufficient. Still required, and all of it in her Meta account
rather than in this repo:

1. Create a catalogue in Commerce Manager and point it at
   `https://themodestyhouse.com/meta-catalogue.xml` on a daily schedule.
2. Verify the domain.
3. Connect it to the Instagram professional account and submit the shop for review
   (24 hours to ~4 weeks).

**The real risk, flagged before she spends the time:** Meta requires the catalogue owner to
be the party selling the goods, and `app/brand-terms/page.tsx` says in our own words that
*"no order is ever placed here."* A directory that hands off to 108 other storefronts may
not pass commerce review. The feed is worth having either way — the same file is what Google
Merchant Center and Pinterest catalogues consume — but the Instagram tagging outcome is
Meta's call, not ours.

## Notes / follow-ups

- If review rejects us on `size`, the sidecar is the fix and is a contained change.
- Nothing links the feed. If it should be discoverable by other tools later, that is a
  deliberate decision to take then, not a default.


---

## The catalogue was created (2026-09-06, later the same day)

Tina asked me to do the Meta-side setup as well. Done, in her own logged-in browser, with
two limits held to throughout: **no logging in** (she did that) and **no accepting the
merchant agreement**, which binds her business and is hers to accept.

```
catalogue      "The Modesty House"  id 2065648288161757
portfolio      themodestyhouse.hq · type Online products · no partner platform
data source    https://themodestyhouse.com/meta-catalogue.xml  (id 1567608597592609)
schedule       DAILY at 10:35 GMT+2 = 08:35 UTC · next fetch Sep 7
upload result  updated or added 19.2K · removed 0 · upload failed 0 · issues 0
```

**One default was wrong and was changed:** Meta proposes an **hourly** fetch. The catalogue
only moves once a night (the 04:10 UTC refresh) and the feed route revalidates hourly, so
hourly would have pulled a 15 MB document 24 times a day to observe nothing. Daily, timed
after the refresh, means Meta always reads a settled catalogue rather than a half-updated
one.

**What I could NOT resolve, and did not paper over.** The data source header reads
`Products: 1K` while its own upload summary reads `Updated or added: 19.2K, failed 0,
issues 0`. The two disagree. The Products grid renders blank in this browser across six
attempts and three URLs, so there is no third number to break the tie. The likely
explanation is that the header counter lags a first ingest — but it had not moved after
~25 minutes, so that is a hypothesis, not a finding, and it is recorded as one.
**Next step is to read the count from the Graph API** (`/{catalog-id}/products?summary=true`),
which needs a system-user token with `catalog_management` — offered to Tina, not yet given.

**A browser note worth keeping.** Meta Business Suite intermittently makes the extension's
script injection time out (45 s) — screenshots, `read_page` and clicks all fail together, so
a flow can look broken when it is the tab that is broken. The first catalogue attempt died
that way and created nothing. **A brand-new tab fixed it immediately.** Before concluding a
Meta flow is broken, retry it in a fresh tab.

## Still outstanding, both requiring Tina's account

1. **Domain verification** for `themodestyhouse.com` (Business Settings → Brand safety →
   Domains). Meta issues the token; the DNS record can then be added at Cloudflare from here.
2. **The shop application**, which is where the merchant agreement is accepted — and where
   the eligibility question flagged above gets answered by Meta rather than by us.
