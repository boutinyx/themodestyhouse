# Recreating @thevirtualedits' 238 outfits from the catalogue

**Date:** 2026-09-05 · **Status:** done

## Goal

Tina: *"you see these outfits that she posted form every post i wnat you to find
similar items in tmh and then you decide what is smart to do it … i think its smart
you go and put the links in obsidian. and batch then per post so each post gets their
own links so i know what items belong to what outfit."* Plus, mid-run: *"im allowing
you when you find more then 1 silimar clothign you can also write thatd own."*

@thevirtualedits is Miryam Bou, an Amsterdam "virtual stylist" with 17.7K followers
whose posts are flat-lay outfit collages — one look per image, 4-8 items on a pale
background. Feminine, minimal, and already close to modest (longline shirts, wide-leg
trousers, high necks), which is why the catalogue can answer most of them.

## What changed

Nothing in the site. This is a read of the published catalogue plus an artefact in
Tina's Obsidian vault at `/Users/tina/ModestDirectory/The Virtual Edit/`:

- `Looks/` — one note per post: the original look itemised, then 2-4 catalogue
  options per garment with brand, price, product photograph and a direct link.
- `Attachments/` — all 246 post images copied in locally. Instagram's CDN URLs are
  signed and expire, so a remote reference would rot; Shopify's do not, so product
  photographs are referenced remotely.
- `The Virtual Edit — Index.md` — a table of every post, regenerable from the notes.

Tooling lives in the gitignored `.scratch-tve/` and is disposable: `index.mjs`
(builds a searchable catalogue with the site's own `classifyColour` and
`garmentSubtype`), `match.mjs` (ranks rows against a described item), `sheet.mjs`
(montages candidate product photographs for visual checking), `note.mjs`, `index.mjs`.

## The harvest, and the trap in it

`docs/log/2026-08-28-instagram-archive-analysis.md` left a follow-up: *"the harvest is
not saved to disk anywhere … if this is worth repeating, it should write JSON."* It
was, and it now does — `.scratch-tve/archive.json`, 238 posts, 246 images.

Three things have changed since that log and are worth writing down:

- **`/api/v1/feed/user/{id}/` no longer works.** It 302s to the web app and returns
  HTML with a `200`. `/api/v1/users/web_profile_info/` still exists but rate-limits to
  `429` — also served as HTML, which surfaces as `SyntaxError: Unexpected token '<'`
  and reads like a parsing bug rather than a rate limit.
- **The working endpoint is `POST /graphql/query`** with
  `fb_api_req_friendly_name: PolarisProfilePostsTabContentQuery_connection`, paginated
  on `page_info.end_cursor`. The `doc_id` is not guessable — capture it by hooking
  `window.fetch` **before** the first scroll and replaying the request body verbatim
  with only `variables.after` swapped.
- **Instagram calls `window.fetch` late enough to hook, but the profile grid
  virtualizes.** DOM link count is therefore a useless progress signal: it sat at 52
  and then 12 while twelve full pages of JSON had already been fetched.

**The trap, and it is §10.52 again.** The first harvest returned 144 posts and looked
complete — contiguous months, no gaps, plausible volume. It was not: the hook had been
installed *after* the page had already loaded the newest ~94 posts, so the capture
began mid-timeline. The newest post in it was dated 2025-08-23, and the account's
actual newest post is 2026-08-30. Nothing about the data said so. What said so was
reloading the page and reading the first grid tile's shortcode, which was a 2026 code
and not in the set. The reconciliation that settles it is the one §10.52 rule 1 names:
**the profile header says 238 posts, and the harvest ends with `has_next_page: false`
at exactly 238.**

## Matching, and why titles are not enough

Ranking is over title keywords, `p.garment`, the subtype from `lib/specialty.ts` and
the colour family from `lib/colour.ts` — the site's own logic, so a match is one the
site's filters would agree with. Then **every pick is confirmed by looking at the
product photograph** before it is written. That step is not ceremony; it changed picks
on the first sheet:

- Veiled's *Wide Leg Pants - Chocolate Truffle* ranks top for "chocolate brown" and
  photographs burgundy.
- Store WF's *Cotton White Longline Shirt Tunic* is white, not the cream its rank
  implied.
- Chic & Modesty's *Almond Linen & Cotton Long Shirt* photographs sage green.

The underlying cause is worth keeping: `classifyColour` reads a colour word wherever
it sits, so **every `jean`/`denim` title classifies as blue regardless of its actual
colour** — `The Barrel Denim [Black]` returns `blue`, confidence `weak`. That is
§10.16's French "jean is the fabric, not the garment" in the colour layer instead of
the garment layer. The matcher now ranks `weak` below a parsed colourway suffix, but
the photograph is what decides.

## Verification

- Archive completeness: profile header `238 berichten`; harvest `238` unique ids with
  `has_next_page: false`. Date span 2023-04-28 → 2026-08-30.
- Images: 246 requested, 246 on disk, 0 zero-byte, all `JPEG` per `file`. One
  (`237_…CrkyuNuNSt1.jpg`) was missing from the first pass because a stray `_test.jpg`
  made the count of `ls img` read 246 while the real file was absent — caught by
  diffing the wanted filenames against the vault, not by the count.
- Coverage across the 13 agents was computed from `all.txt` rather than assumed:
  posts 6-237 are covered exactly once, and index 93 — the one post claimed twice —
  was reassigned before either note was written.

## Notes / follow-ups

- **The post-index ranges in the agents' spawn prompts were wrong.** They were computed
  as `sheet × 6`, which is image position, and carousels put more images than posts in
  the list, so the two drift apart after the first carousel. Agent `tve-05` caught it
  from its own `sed`-derived numbers and said so; every agent was corrected. The brief
  had named the `sed` formula as authoritative, which is the only reason this was
  harmless.
- The directory is clothing only — no bags, shoes, sunglasses, jewellery or watches,
  which is roughly half the items in a typical collage. Each note lists them and marks
  them as having no equivalent rather than silently dropping them.


---

## Final state

```
238 notes          one per post, no duplicates, no gaps, none orphaned from a picks file
546 garment slots
1,477 options      colour-matched, each confirmed against its own product photograph
2,027 options      same piece in another colour (see below), behind a <details> fold
3,504 total        6.4 options per garment, 965 distinct products, 79 of 112 brands
  1 garment        with nothing close enough (post 175's crochet peter-pan collar —
                   the directory stocks no detachable collars)
752 accessories    listed and marked as having no equivalent
```

**Tina changed the rule mid-run:** *"look the color doesnt matter if its the same
garment but a differnt color still put it in."* Rather than re-running the match, the
colour-matched picks — which had already been eyeballed one by one — were used as a
SHAPE PROFILE: same `garment`, same set of subtypes, same outerwear flag, colour not
scored at all. That widens colour without loosening shape.

The first attempt at this was wrong and is worth recording. Taking only a *single*
agreed subtype meant that whenever the verified picks spanned two (`top/tunic` and
`top/shirt`), the slot ended up with no shape constraint at all — and the keyword
`shirt` then pulled `cropped-body-shirt` base layers into a longline-shirt slot, which
the brief explicitly forbids. Caught by reading the regenerated note rather than the
counts. Constraining to the SET of observed subtypes, plus a hard underlayer blocklist,
fixed it: 2,127 extras became 2,027, and the same slot now offers four genuine
oversized shirts.

## Verification

- **Counts reconciled.** Two counters disagreed by 31 (3,473 vs 3,504); the stricter
  regex was silently dropping options whose product title contains a bracket. Settled
  with one parser that reports how many option-looking lines it failed to parse — it
  reports 0, so 3,504 is the number. The same bug was in the link checker, which had
  therefore checked 957 of 965 URLs; fixed and re-run over all 965.
- **Coverage:** 238 notes / 238 distinct indices / 0 duplicates / 0 missing / 0 notes
  without a picks entry, checked by parsing `index:` out of every note.
- **Links: 965 distinct product URLs, 0 broken.** GET not HEAD (§10.47 rule 4), and the
  body is checked, not the status (§10.3) — a Shopify 404 page is 544 KB and contains
  both "product" and "price", so it passes a body heuristic and is caught only by the
  status. Negative control run first: a live product passes, two different 404s and a
  non-resolving host are all flagged.
- **§10.44 recurred twice, in my own harness.** The first run reported 10 broken; 9 were
  HTTP 429 from my own concurrency against one brand. The second reported 18; all 18
  cleared. `linkcheck.mjs` now retries every failure serially before calling it broken.
  One link was genuinely dead — `manzaram:15668583399749`, 404 at the brand — and is
  excluded.

## Findings that are not about outfits

Three things surfaced that matter to the site rather than to this task:

1. **Five menswear products are published.** All Vivi Zubedi, all men's baju koko on a
   male model, all with gender-neutral titles ("VZ Clemyra Long Shirt – Ivory") that no
   text filter can catch — §10.4's exact shape. The signal that does catch them is one
   nothing in the pipeline has ever read: the IMAGE URL, `VZ-CATALOG-MEN_DSC03260.jpg`.
   Confirmed by looking at all five photographs.
   **My first sweep said 31 and 26 were false positives**, because masking "women" with
   a placeholder that still contained "MEN" re-created the very §10.5 collision the mask
   existed to prevent. The control caught it; the count never reached Tina.
   Ids: `vivi-zubedi:77673`, `77669`, `77665`, `76481`, `63761`. Not actioned — that is
   an `exclusions.json` edit plus a republish, and §10.53 says not to do that on a base
   this session has not re-fetched.
2. **At least 44 products state a colourway their own photograph contradicts** — "Striped
   maxi dress – dark blue" that is orange, "Siyah Sweater" (*black*) that is red,
   "Linen/Cotton Button Dress Olive Green" that is pale yellow, "Nil Linen Maxi Skirt
   Anthracite" that is brown. Counted from rejections the agents recorded while looking,
   so it is a floor, not a rate — nobody audited systematically. It bears directly on the
   grid's Colour filter, which classifies from titles.
3. **Nour Al Houda's storefront is back**, closing the 718 dead links from 2026-09-03 —
   recorded as a correction on that entry.

## Notes / follow-ups

- `.gitignore` gained `/.scratch-*/`. `.scratch-tve/` alone is 152 MB of downloaded
  photographs and was untracked AND unignored, which §8 names as a hazard; six older
  scratch directories were in the same state. Nothing outside a scratch directory
  references one — checked before adding it. Nothing was committed this session.
- The vault artefact is 28 MB, of which 26 MB is the 246 post images copied in so the
  notes survive Instagram's signed URLs expiring.
- Worth building if this is repeated: the shape-profile expansion in `expand.mjs` is a
  general "more like this, any colour" query over the catalogue and has nothing to do
  with Instagram.
