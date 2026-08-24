# Category card photos swapped — Dresses, Activewear, Skirts
**Date:** 2026-08-24 · **Status:** done (not deployed)

## Goal
Tina supplied three photographs: an aubergine satin maxi on a London street
("this one for dresses"), a white modest set on a blue padel court
("activewear"), and — after a first skirts photo was
superseded minutes later — a grey panelled denim maxi skirt on cobblestones
("this one for skirts"). All three are for the homepage "By category"
showcase cards.

## What changed

**New files in `public/category/`** — `dresses-2.png`, `activewear-2.png` and
`skirts-3.png`, plus their generated `-400/-700/-1000.webp` variants from
`node scripts/optimise-images.mjs`. `dresses.png`, `activewear.png` and `skirts.png`
are untouched on disk. This is CLAUDE.md §6's public/ rule, not fastidiousness:
Railway serves `public/` with `cache-control: public, max-age=14400` and Next
does not fingerprint these paths, so new bytes at an old path are invisible for
four hours to anyone who already loaded the page (§10.21). It also matches the
`abayas-2` / `tops-2` convention from the earlier swaps in the same array.

**`app/page.tsx`** — the three `CATEGORY_SHOWCASE` entries now point at the new
files, each with a comment recording the request. Skirts is `zoom: 1.15, origin: '50% 68%'`
— Tina: "zoom a bit in". At a plain 1.15 the zoom anchors on the box centre and
the front shoe falls off the bottom-left corner; dropping the origin to 68%
keeps the bottom of the frame (hem and both shoes) and spends the crop on the
cobblestones above her instead, which carry nothing.

**Why `skirts-3` and not `skirts-2`.** The first skirts photograph (a mauve
floral chiffon maxi) was added, rendered, and replaced by Tina within the same
session. Its files never left this machine — never committed, never deployed —
so I deleted them rather than leave dead assets in `public/`, and took the next
number anyway. `public/` paths are not versioned, and the §10.21 rule is
absolute for a reason; reusing a name that a browser somewhere might already
hold is not worth the two keystrokes saved.

**The Dresses card went `zoom: 1.24` -> none -> `zoom: 1.12`.** That value was tuned on 2026-08-23
for the PREVIOUS photograph. Rendered against this one it cut the model's head
off at the chin and clipped her shoes at the bottom — the new photo is framed
full-body with much less dead space than the old one, so the crop that fixed
the old photo breaks this one. Source is 1122x1402 (0.80) into a 3/4.4 (0.682)
card, so `object-fit: cover` alone trims the sides and keeps the full height —
head to heels, which is what a Dresses card needs to show. Tina then asked for
it "a bit zoomed in" anyway, so it sits at **1.12** — measured as the point where
the dress fills more of the card while the top of her head and both heels are
still inside the frame. 1.24 is past that line on this photograph; 1.12 is not.
Activewear keeps no zoom, as before.

## Verification

Rendered against the running dev server and looked at, rather than assumed
(§10.22 rule 2 — an automated pass proves only what it measures, and nothing
here is measurable except by eye):

- Desktop 1280: both cards screenshotted individually and the full six-card
  grid together. Correct variants served (`dresses-2-700.webp`,
  `activewear-2-700.webp`), transform `matrix(1,0,0,1,0,0)` on Dresses
  confirming the zoom is gone.
- Mobile 390 (Chromium, DPR 2): each card full-bleed at 382x622, serving the
  `-1000.webp` variant. Dress is head-to-toe with headroom; the activewear
  overhead composition keeps the model, racket and all three balls; the skirt
  keeps hem to shoulder with both shoes in frame.
- The zoom regression was caught by rendering the FIRST attempt (zoom kept at
  1.24) and looking at it, before changing anything else. Every subsequent zoom
  value here was chosen the same way — render, look, adjust — never by picking a
  number that sounded right. Both of the zoom requests in this session produced a
  clipped limb on the first value tried, which is the argument for looking.

`public/category/` variant dimensions confirmed on disk: 400x500 / 700x875 /
1000x1250.

## Notes / follow-ups

- **Not committed or deployed.** `app/page.tsx` carries a large amount of other
  uncommitted work from concurrent sessions, so staging it would ship their
  changes under this one's message (§10.30). Shipping this means either landing
  it together with that work, or cherry-picking the two `CATEGORY_SHOWCASE`
  lines plus the four new image files in a clean worktree, the way
  `docs/log/2026-08-24-outbound-utm-tagging.md` describes.
- `naturalWidth` on these `<img>`s reports ~390x487, not 1000x1250. That is not
  a wrong variant: with `srcset` `w` descriptors plus `sizes`, browsers report
  the density-corrected intrinsic size. `currentSrc` is the honest field, and it
  reads `-1000.webp` on a DPR-2 phone as intended.
- A WebKit mobile pass was attempted and abandoned: it needs the HSTS /
  `upgrade-insecure-requests` header-stripping the audits use (§10.24), and even
  with that, `next dev` was reloading via HMR mid-run — another session is
  actively editing this tree — which detached elements between query and click.
  The crop here is `aspect-ratio` + `object-fit: cover`, not the percentage
  `max-height` that §10.24 was written about, so Chromium is adequate evidence
  for composition. `npm run audit:visual` against a production build is the
  proper cross-engine check if one is wanted.
