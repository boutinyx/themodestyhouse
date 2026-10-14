# Every Ghost card now renders on the site (the full allowlist)
**Date:** 2026-10-14 · **Status:** on staging, waiting on Tina's approval for main

## Goal
Tina, after the agency's third "my content vanished" email: *"i wanna the whole allow list for
them"*. Stop extending the renderer one reported tag at a time. Cover everything the Ghost
editor can produce, and give the agency the complete list.
Follows `2026-10-14-ghost-tables-and-faq.md` (the table/FAQ fix that started this).

## Method
I created a throwaway draft through the Admin API holding one of every card and element:
- every Ghost card: image, gallery, code, YouTube and Instagram embeds, bookmark, button,
  callout, toggle, video, audio, file, product, header, signup, CTA, paywall
- a Markdown card (table, footnote, strike/mark/sub/sup)
- an HTML card with common pasted tags

I read back the HTML Ghost actually produced, then deleted the draft. Verified gone:
`posts: []` for its id. The capture is `components/GhostHtml.every-card.html`.
Card property names came from `@tryghost/kg-default-nodes` 2.1.5. The source was read only,
not executed.

Under the **old** renderer, 14 of 25 types lost the words the author typed. That included the
**bookmark card**: real Ghost wraps it in `<figure>`, which the renderer dropped, so bookmarks
have been vanishing on production.

## What changed
- **`components/GhostHtml.tsx`, rewritten:**
  - One renderer per Ghost card (`CARD`).
  - An unknown tag is unwrapped: its words are kept and the tag goes. Only tags that can run,
    embed or submit something are dropped whole (`NEVER_RENDER`).
  - Heading slugs and footnote ids are kept, except ids the page itself uses.
  - Pasted `cdn.shopify.com` images are allowed.
  - YouTube is rebuilt to `youtube-nocookie.com/embed/<id>`; Vimeo to `player.vimeo.com/video/<id>`.
  - Video, audio and files must come from our own Ghost.
  - The signup card keeps its heading and text, and its button links to the footer form
    (`#newsletter`). The footer form itself is styled for the dark footer and has a fixed id,
    so it can't be reused in the article.
- **`next.config.ts`:**
  - `frame-src` adds youtube-nocookie and player.vimeo.com.
  - `media-src` adds `cms.themodestyhouse.com`.
- **`components/Footer.tsx`:** `id="newsletter"` on the sign-up block.
- **`app/globals.css`:**
  - Styles for h5/h6, dl, kbd, video, embed (16:9), gallery rows.
  - **A pre-existing production bug fixed:** `.editorial-prose a.btn-pill` had `color: inherit`,
    so every Ghost button and CTA showed dark text on aubergine. One live post is affected:
    the abaya guide.

## Verification
- **`components/GhostHtml.test.tsx`, 26 passing:**
  - Every capitalised marker in the real capture survives, except the 2 deliberate drops.
  - No card chrome (player controls, `0:00`, `1×`) and no Ghost colours get through.
  - Footnotes link both ways.
  - Iframes are rebuilt or dropped.
  - Foreign media is refused.
  - Unknown tags keep their words.
- **Security review** by a separate agent, 12 hostile inputs:
  - No script execution found.
  - 3 gaps found, all fixed in `7b71218`:
    - `https://themodestyhouse.com//evil.example` became the off-site link `//evil.example`.
      This was present in the OLD renderer too.
    - Article ids could take `newsletter` or `newsletter-email`.
    - `srcset` was copied unchecked.
  - The new test **fails on the pre-fix code** (1 failed) and passes after.
  - Accepted, not fixed: a Markdown card can contain a hand-written `<div class="kg-card
    kg-product-card">` that renders as one of our boxes. Every attribute is still ours, and
    external links still get `sponsored`.
- **Regression check** over all 8 published posts, old renderer against new:
  - 0 words lost anywhere.
  - `abaya-guide-how-to-choose-the-right-fit-and-fabric` gains 57 words. That is a table that
    has been **missing on production**.
- **Staging, deployed:**
  - The response CSP carries the new `frame-src`/`media-src`.
  - The every-card body was placed into a real staging article and rendered in Chromium at
    1280 and WebKit at 390. Results: no CSP errors, `scrollWidth` equal to the viewport,
    2 YouTube frames loaded and playing (screenshot), gallery in rows, video and audio players,
    file box, product stars (Phosphor), header and signup boxes, table, footnotes.
- `tsc --noEmit` clean, eslint clean on the touched files.
- Full suite: the same 3 catalogue-drift failures as `origin/main`, nothing new.

## The list the agency was sent
**Works:**
- Every text format: headings H2–H6, bold, italic, underline, strike, highlight,
  sub/superscript, links, quotes, lists, dividers.
- Image, gallery, button, callout, toggle (FAQ), bookmark, CTA, product, header, file, video
  and audio cards, plus YouTube and Vimeo embeds. Video, audio and files must be uploaded to
  Ghost.
- Markdown cards, including tables and footnotes.
- HTML cards: any ordinary HTML, including tables and `<details>` FAQs.

**Doesn't work:**
- Inline styles, classes, fonts and colours. House styling replaces them.
- Instagram, TikTok, X and other embeds. These show as a link only.
- Scripts, forms, raw `<button>`s, and iframes other than YouTube/Vimeo.
- Images hosted anywhere except Ghost or Shopify.
- The signup card's small print. Its button goes to our own newsletter form.

## Notes / follow-ups
- If Ghost adds a card, re-capture it into the fixture. An unknown `kg-card` is dropped and
  logged as `[GhostHtml] dropped an unknown Ghost card` in Railway's logs.
