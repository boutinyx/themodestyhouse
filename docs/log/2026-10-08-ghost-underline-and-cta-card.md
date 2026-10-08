# Editorial: underlined text, Ghost's other formats and the CTA card now render
**Date:** 2026-10-08 · **Status:** done (live on production)

## Goal
The agency reported that the closing "Shop all abayas" link of
`/editorial/abaya-guide-how-to-choose-the-right-fit-and-fabric` showed in Ghost but not on the
live page. They had tried a CTA card, an HTML card and a plain link, and none of them rendered.

## Cause
`components/GhostHtml.tsx` rebuilds Ghost's HTML through an allowlist, and drops any tag that
isn't on it **together with its children**. The post's last link, as Ghost's Content API
returns it:

```html
<p><a href="https://themodestyhouse.com/modest-abayas"><strong><u>Shop all abayas on The Modesty House</u></strong></a></p>
```

`u` was not on the list, so the words were dropped and production rendered
`<a href="/modest-abayas"><strong></strong></a>`: a link with no words in it. The CTA card
(`kg-cta-card`) was not in `CARD_CLASSES`, so it was dropped too. The HTML card is dropped on
purpose, because it can carry `<script>`. Plain links that aren't underlined work: the same
article's "open abaya" / "closed abaya" links render on production.

## What changed
- `components/GhostHtml.tsx`
  - `PLAIN` gains `u`, `s`, `del`, `mark`, `sub`, `sup`, which completes the Ghost editor's
    inline formats.
  - The CTA card renders: a bone box with a hairline border (the callout's styling), the
    sponsor label as `.eyebrow`, the text as written, and the button as `.btn-pill`. Ghost's
    inline `style` on the button is dropped, like every other attribute. Its markup was taken
    from Koenig's `calltoaction-renderer.ts` (TryGhost/Koenig, main), not guessed.
  - Empty `p`/`h1`–`h4` are dropped. Ghost had left `<p></p><p></p><h2 id=""></h2>` at the end
    of this post.
  - HTML cards stay blocked.
- `components/GhostHtml.test.tsx`: three tests. One uses the post's closing line verbatim, one
  uses Koenig's CTA markup, one covers empty blocks. All three failed before the fix.

## Verification
- `npx vitest run components/GhostHtml.test.tsx`: 3 failed before the change, 14/14 after.
- `npx tsc --noEmit` clean, eslint clean on both files.
- Full suite: 1348 passed, 2 failed (`lib/colourLeads.test.ts`, `lib/unavailableProducts.test.ts`).
  Both assert over catalogue data files and import nothing touched here.
- Staging (`b8893de`), on https://themodestyhouse-staging-production.up.railway.app/editorial/abaya-guide-how-to-choose-the-right-fit-and-fabric:
  the HTML ends `<a href="/modest-abayas"><strong><u>Shop all abayas on The Modesty House</u></strong></a></p></article>`,
  and the empty trailing blocks are gone. In Playwright Chromium at 1280px the link is visible
  (311x24, aubergine, underlined, bold), and clicking it lands on `/modest-abayas`.

## Notes / follow-ups
- Tell the agency not to use the Custom HTML card. Plain links, formatted links, the button
  card and the CTA card all work.
- Production: Tina approved. ONLY this fix was cherry-picked onto `origin/main` (`93ebbbf`, log
  `087bab5`). Staging also holds unapproved work (Creators pages, the Ghost theme), so it was not
  fast-forwarded. The origin served the new HTML on a cache-busted GET (`MISS`). Then I ran
  `purge_everything`, and the canonical URL gave GET 1 `MISS` and GET 2 `HIT`, both with the link
  text. In Playwright the link is visible and clicking it lands on
  `https://themodestyhouse.com/modest-abayas`.
- The link was the agency's own, already in Ghost. Nothing was edited in Ghost.
- **Later the same day, at Tina's request, I removed the closing link from the Ghost post** so the
  agency can add it again herself and see it render. Only that lexical node (index 85, the
  `/modest-abayas` link paragraph) was removed via the Admin API, guarded on the backup's
  `updated_at`. The empty paragraphs and heading after it were left as she wrote them. Backup of
  the full post before the edit: `data/.backups/ghost-abaya-guide-2026-10-08-before-link-removal.json`
  (local, not committed). On the live canonical URL the link text is gone (`MISS`, first
  try), while "Each listing takes you…" and the `?type=open` link are still present.

## Follow-up: the HTML card (`b9a8c8a`, staging)
Tina asked for all of the agency's requests to be done, which includes "render the HTML card".
Koenig's `html-renderer.ts` gives that card NO wrapper element. The pasted HTML just sits
between `<!--kg-card-begin: html-->` and `<!--kg-card-end: html-->`. `GhostHtml` now turns those
comments into a marker element and renders the content through the **same allowlist**: layout
containers (`div`, `section`…) become attribute-less `div`s, and a link whose class contains
`btn`/`button` gets `.btn-pill`. `script`, `style`, `iframe`, `form`, inline styles, classes and
event handlers are still dropped. Pasted HTML gets the site's own styling, not its own.
- Test built from Koenig's real output shape, with a pasted `<style>`, `<script>`, `<iframe>` and
  `onclick`. It failed before the change and passes after (15/15). tsc and eslint are clean. The
  full suite has the same two unrelated data failures as before.
- **Not verified with a real HTML card.** Ghost is one shared CMS behind staging and production,
  and no published post uses an HTML card, so the only evidence is the unit test. Staging's
  abaya page still renders correctly (200, body intact).
- **Production:** Tina approved ("I want her to be able to use html card if she wants next time").
  Cherry-picked alone onto main as `d592ac3`. Five minutes after the push the live abaya page
  returned 200 with its body intact, both cache-busted and on the canonical URL after
  `purge_everything`. No live post uses an HTML card, so nothing on the page shows that the new
  build is the one serving. The first real HTML card the agency publishes is the verification.
