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

---

## "I was up there until yesterday when we changed the favicon"

**The favicon cannot be the cause, and the timestamps settle it.** Google last crawled the
homepage at **2026-09-02 11:48 UTC** (URL Inspection, checked live). The favicon changed in
`727c343` at **17:32** — nearly six hours later. Google has not fetched the page since, so
whatever it is showing today was built from a crawl that predates the new favicon entirely.
Favicons are a display asset in the SERP; they are not a ranking input.

Everything structural checks out, live:

```
verdict           PASS
coverageState     Submitted and indexed
robotsTxtState    ALLOWED          indexingState  INDEXING_ALLOWED
pageFetchState    SUCCESSFUL       lastCrawlTime  2026-09-02T11:48:49Z
googleCanonical   https://themodestyhouse.com/   (= userCanonical)
no X-Robots-Tag · no meta robots · /favicon.ico, /icon.png, /apple-icon.png all 200
```

**A change yesterday cannot be confirmed or denied from Google's own data.** Search Console
has nothing after **2026-08-31** — it runs two to three days behind. Up to that date the
trend is straight up, not down:

```
08-18    0c    38i  avg pos 57.4
08-27    3c   396i  avg pos 21.5
08-30   11c   961i  avg pos 14.1
08-31    8c   899i  avg pos 14.1
```

`"the modest house"` was **position 1.0 on 08-30** and 4.0 on 08-31, so it was ranking for
the phrase days ago.

**The likeliest explanation is the browser, not the site.** Her screenshot is taken in
**Incognito**. Signed in and out of incognito, Google personalises heavily toward sites the
user visits constantly — and she is on her own site all day. That can put it at the top for
her and nowhere for anyone else; incognito strips it away, which reads as a sudden
disappearance. Nothing in the index changed.

## `sameAs` is now filled — the blocker is cleared

Tina supplied the handle directly: **`themodestyhouse.hq`**. `lib/schema.ts` set the terms —
*"add sameAs the day real accounts exist, and not before"* — and they are met. Inference was
never an option here: three unrelated accounts use this exact brand name.

- `components/Footer.tsx` — the Instagram icon pointed at `https://instagram.com`, the
  platform's front door. Now the profile.
- `lib/schema.ts` — `sameAs: ['https://www.instagram.com/themodestyhouse.hq/']`.
- **Pinterest and TikTok icons removed**, Tina's call: both linked to the platform
  homepages and no handle exists. An icon that takes you to TikTok's front page is worse
  than no icon. Instagram inherits the -12px margin so the row stays flush.
- New test: `sameAs` must name a PROFILE path, never a bare platform homepage — the exact
  mistake the old note existed to prevent. Control checked: `https://instagram.com` fails it.

Live and verified on production after purge — `MISS` then `HIT`, `sameAs` present both
times, zero bare platform links. `npm test` 1,100 passed.

**This will not work overnight.** `sameAs` is an entity signal Google has to re-crawl and
then trust; the thing to watch is whether "the modesty house" as a phrase starts returning
this site, and that is weeks, not days.
