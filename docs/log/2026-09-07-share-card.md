# A real share card, replacing the August video-poster frame
**Date:** 2026-09-07 · **Status:** done (staging verified; not yet on main)

## Goal

Tina, with a screenshot of a WhatsApp share: *"we need to change the og image becuase its
not good right now when i send my oage to someone a old picture comes this one … and that
isnt the right one."*

## What was wrong

`public/hero-poster.jpg` — a video poster frame dated 3 August, a cropped street photograph
of one person on a bridge, carrying nothing that named the site. It was the `og:image` for
**every page**, from three places:

```
app/layout.tsx            DEFAULT_OG_IMAGE  — the site-wide default
lib/seoCopy.ts            OG_IMAGE          — buildMetadata, so every page using pageMetadata
app/designers/[slug]      inlined twice     — openGraph + twitter
```

Nothing used it as an actual video poster any more. It was purely the share card, and it
had been wrong since the poster it was cut from stopped being used.

## What changed

`public/og-card-1.jpg` — 1200x630, 76 KB.

Built entirely from assets that already exist: the live homepage hero
(`hero-home-10.jpg`), `public/logo.png`, Bodoni Moda + Marcellus, the brass rule, and the
tagline `app/layout.tsx`'s own description already carried. **Nothing commissioned or
invented** (§10.18's principle, applied to imagery). Composed in a headless browser against
the real Google webfonts rather than approximated, so the typography is the brand's.

Four candidates were rendered and put on Tina's Desktop; she chose the hero-plus-wordmark
over a bare photo, a parchment card and an aubergine card.

**A NEW FILENAME, deliberately.** `public/` is served with `cache-control: max-age=14400`
and Next does not fingerprint these paths (§6, §10.21) — and a social platform caches an
`og:image` by URL far more stubbornly than a browser. New bytes at `/hero-poster.jpg` would
have left the bridge photo in circulation indefinitely. The old file is now referenced by
nothing and is left on disk rather than deleted.

**`width`, `height` and `alt` are now declared.** Without dimensions WhatsApp and LinkedIn
fetch the file before deciding whether it earns a large card, and often fall back to the
small thumbnail on a URL's first share.

## The gap this exposed

**Nothing tested the share card.** It is the one asset nobody sees while working on the
site — it appears only when a link is pasted into a chat — which is precisely how a
wrong image survived a month until Tina shared her own page.

`lib/ogImage.test.ts` now asserts:

1. at least one page references an OG image, and `/og-card-1.jpg` is among them — so the
   whole file cannot pass vacuously if the reference-scraping regex stops matching;
2. every referenced path exists in `public/`;
3. the card is exactly 1200x630 and under 1 MB (Facebook's ceiling is 8 MB, but a scraper
   times out long before that and then shows no card at all).

These are properties of the REPO, not of the catalogue, so unlike an assertion over
`products.json` the nightly refresh cannot turn them red (§10.19).

**Negative controls run before trusting it** (§10.28 rule 1):

```
metadata pointed at /og-does-not-exist.jpg   -> 1 failed | 2 passed
card resized to 800x418                      -> 1 failed | 2 passed
restored                                     -> 3 passed
```

## Verification

`npx tsc --noEmit` clean · `npm run lint` exit 0 · `npm test` **1172 passed**.

On staging:

```
<meta property="og:image"        content="https://themodestyhouse.com/og-card-1.jpg"
<meta property="og:image:width"  content="1200"
<meta property="og:image:height" content="630"
<meta property="og:image:alt"    content="The Modesty House — the archive for everything modest"
<meta name="twitter:card"        content="summary_large_image"

/og-card-1.jpg   http=200  bytes=77739  type=image/jpeg

  /new-in            og-card-1: 1 | hero-poster: 0
  /modest-dresses    og-card-1: 1 | hero-poster: 0
  /designers/veiled  og-card-1: 1 | hero-poster: 0
```

The `hero-poster: 0` column is the control — counting only the new string would pass just
as well on a page that still carried both.

## Notes / follow-ups

- **Already-shared links will keep showing the old picture.** WhatsApp, Facebook and
  LinkedIn cache an `og:image` by URL and re-scrape on their own schedule; new links are
  correct immediately. Facebook's Sharing Debugger forces a re-scrape per URL if Tina wants
  the old ones refreshed.
- The `og:image` URL is absolute against `metadataBase`, i.e. `themodestyhouse.com`, even
  when served from staging. That is correct — staging must not advertise itself — but it
  means the tag on staging points at a file production does not have until this merges.
- `public/hero-poster.jpg` (340 KB) is now unreferenced. Left in place deliberately rather
  than deleted.
