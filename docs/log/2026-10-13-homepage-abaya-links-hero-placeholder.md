# Homepage: abaya subtype links, and a blurred placeholder under the hero photo
**Date:** 2026-10-13 · **Status:** on staging

## Goal
From the 2026-10-13 growth plan (`2026-10-13-growth-research-plan.md`). A first version (`home/entry-points`, 4681741)
also shortened the phone hero by 72px to pull the category strip above the fold, and pinned the two best articles
into the story column. Tina rejected both: "no were not gonna go that it looks ugly … keep the editorials on the
homepage". She asked instead: "the photos are loading in real time because i see the purple background when it loads."

## What changed
- `app/page.tsx`: under "Our picks on abayas", links to Open / Kimono / Butterfly / Closed abayas. Labels and hrefs
  from `subtypesForLane('modest-abayas')`; plain underlined links, not chips (Tina removed a chip row of these 2026-08-26).
- `app/globals.css` `.hero-placeholder`: the hero div's flat aubergine background is now a 32px-wide copy of the
  same crop (152 B desktop, 370 B phone), inlined as a data URI so it paints with the HTML and costs no request.
  Scaled to cover, it reads as a soft blur of the photograph until the real image covers it. The photograph's own
  quality is unchanged (the phone loads the 1290w variant, 376 KB, on a 3x screen; edge-cached, `HIT` measured).
- Hero height and the story column are exactly as on main.

## Verification
- `GHOST_OFFLINE=1 npm run build` exit 0; `next start -p 3613` returned 200.
- Playwright with the real hero webp requests ABORTED, so only the placeholder can show: chromium 390 and 1440
  render a blurred version of the photograph instead of purple (`/tmp/stgshot/ph-chromium-{390,1440}.png`).
  `[data-hero]`'s computed background-image is the data URI in chromium and webkit at both widths.
  (The webkit screenshots are not evidence: its header-stripping route was registered after the abort route and
  took precedence, so the real photo loaded.)
