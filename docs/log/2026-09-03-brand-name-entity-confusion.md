# "I'm gone" — Google autocorrected the brand name, and four sites share it
**Date:** 2026-09-03 · **Status:** investigated · one fix blocked on Tina

## What Tina saw
A screenshot of `google.nl/search?q=themodestyhouse` in incognito, showing
modestyhouse.ca, modestyhaus.com, an Instagram account and a Rotterdam shop's knowledge
panel — and no themodestyhouse.com anywhere.

## What is actually happening

**Google autocorrected the query.** The top of her own screenshot says it:
*"Dit zijn resultaten voor **the modesty house**"* — she typed one word, Google searched
the three-word phrase, and served results for that instead.

Verified by running both, on google.nl:

```
themodestyhouse  (as typed, autocorrected)   themodestyhouse.com: NOT on the page
themodestyhouse  (&nfpr=1, correction off)   themodestyhouse.com: RESULT #1
                                             + an AI Overview describing the site
                                               and citing themodestyhouse.com
                                             16 mentions of the domain on one page
the modesty house (the corrected phrase)     NOT on page 1
                                             modestyhouse.ca · modestyhaus.com ·
                                             modestyhome.com · modestystyleco.com · tiktok
```

`&nfpr=1` is exactly what the *"Zoek in plaats daarvan naar themodestyhouse"* link does.

Search Console agrees, 90 days:

```
  0c   51i  pos 10.5   "modest house"
  1c    9i  pos  3.3   "modesty house"        <- pos 1.0 in the NETHERLANDS
  0c    3i  pos 26.3   "the modest house"     <- pos 1.0 in the NETHERLANDS
  0c   10i  pos 23.1   "the modesty"
```

`themodestyhouse` as one word has **no impressions at all** — essentially nobody searches
it that way. So this is not a ranking collapse; it is one query shape, autocorrected.

## The real problem underneath

Google does not yet hold "The Modesty House" as a distinct brand entity, and the name is
unusually contested:

- **modestyhouse.ca** — "Modesty House", an actual modest-fashion shop
- **modestyhaus.com** — "MODESTY HAUS"
- **modestyhome.com**, **modestystyleco.com**
- **House of Modesty**, a Rotterdam clothing shop with a Google Business Profile, which
  owns the local knowledge panel on google.nl
- and at least three unrelated Instagram accounts using the name:
  `@themodestyhouse` (a Catholic modesty brand — *"Patron Protector: St. Therese of
  Lisieux"*, contactmodestyhouse@gmail.com), `@themodestyhouse.hq`, `@the.modesty.house`

With nothing distinguishing them, Google resolves the phrase to whichever has the stronger
entity signals — and right now that is not us.

## What would fix it, and what is blocking it

**`sameAs` on the Organization schema.** It is the field that actually drives entity
resolution — it tells Google which social profiles ARE this organisation, which is how a
brand gets consolidated into one entity rather than confused with four others.

It is deliberately absent, and the reason is recorded in `lib/schema.ts`:

> *DELIBERATELY ABSENT — `sameAs`. It cannot be filled honestly:
> components/Footer.tsx links to bare pinterest.com / instagram.com / tiktok.com because
> there are no profiles. Pointing sameAs at a platform's homepage claims an identity that
> does not exist, which is worse than omitting it. Add sameAs the day real accounts exist,
> and not before.*

That reasoning still holds, and it identifies a **second, live defect**: the three social
icons in the footer point at `https://pinterest.com`, `https://instagram.com` and
`https://tiktok.com` — the platforms' homepages, not her profiles.

**Blocked on one thing only: the real handles.** Given them, both the footer links and
`sameAs` can be filled in one change. Guessing is out of the question here precisely
because three accounts with this exact name belong to other people.

`alternateName` is also absent, and `lib/schema.ts` rules it out as invented brand copy
(§10.18). Left alone — that is another session's documented decision and marginal either
way.

## Not a problem
- The homepage is indexed and ranks **#1** for the literal brand string, with an AI
  Overview citing it. The GEO work from 2026-09-02 is visibly being used.
- In the Netherlands specifically, the site is **position 1.0** for both "modesty house"
  and "the modest house" — on 1 impression each, which is why it feels invisible.
