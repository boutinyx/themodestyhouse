# Fall Essentials: real hero photograph, and its banner moved below "By category"
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina supplied two files —
`~/Downloads/magnific_uitbreiden_DomU6wcpcl.png` and
`~/Downloads/magnific_upscaler_bxlcMFP5Y2.png` — with *"the image"*, then
*"and i want it on homepage under by catogory"*.

They are one shot in two crops: 2674x1504 (1.77793) and 3584x4800 (0.74667) —
i.e. a desktop/phone hero pair, which is exactly the shape `Edit` wants. And
`lib/edits.ts`'s **Fall Essentials** entry was sitting on an explicit placeholder
hero (the lace hero, reused, with `imageAlt: 'Placeholder — awaiting the Fall
Essentials hero photograph'`) whose own comment listed the replacement steps.
Burgundy is also the first of that edit's six named colours. Installed there.

## What changed

**The hero.** Followed the placeholder's own instructions rather than improvising:
- `public/edit-fall-hero.jpg` and `public/edit-fall-hero-mobile.jpg` — NEW
  filenames, never used before, per §6/§10.21 (public/ is served with a 4h cache
  and is not fingerprinted). Converted from her PNGs at quality 92; no resize, so
  both are pixel-identical in dimensions to what she sent.
- `scripts/optimise-images.mjs` — two new jobs, quality 95 like every other hero.
  **Desktop widths stop at 2674**, the source's own width: the script never
  upscales, so copying the lace hero's 3200/3840 entries would have written
  nothing and left two 404s in the srcset. Phone stops at 1920.
- `lib/edits.ts` — the five image fields now point at the pair, with ratios
  MEASURED (`2674 / 1504`, `3584 / 4800`), not rounded, and `imageWidths` /
  `imageMobileWidths` listing only what the optimiser actually wrote. Real
  `imageAlt` describing the photograph replaces the placeholder string.
  The phone crop is 0.74667, effectively identical to the lace phone hero's
  0.7468, so `EditBanner`'s `--edit-hero-ratio` handling needed no change.

**The placement.** `app/page.tsx` — the homepage rendered all three edit banners
together in one `EDITS.map`. Fall Essentials is now excluded from that group and
rendered on its own immediately after the "By category" section. The slug lives
in a module-scope `EDIT_BELOW_CATEGORIES` const in `app/page.tsx`, NOT as a new
flag on the `Edit` type: where a homepage banner sits is a fact about this page's
layout, and `lib/edits.ts` is also read by `/edits/[slug]` and the sitemap, which
have no opinion about it.

## Verification
- `node scripts/optimise-images.mjs` wrote 11 variants: desktop 640/1024/1440/
  1920/2400/2674, phone 390/780/1170/1560/1920. Each was then fetched from a
  `next start` build — all `200`, including the two edge widths and the .jpg
  original.
- `npx tsc --noEmit` exit 0 · `npm run lint` clean · `npm test` 47 files,
  773 tests passed · `npm run build` compiled.
- Homepage section order read off the rendered DOM by scroll position:
  `Popular items (1103) → Jersey Hijabs banner (2115) → Everyday Lace banner
  (2943) → Our picks on abayas (3479) → By category (4250) → Fall Essentials
  banner (6014) → Independent labels (6553)`. Exactly as asked.
- Banner screenshotted at 1440 and 390 with the stylesheet assertion (body
  background `rgb(250,247,241)`, not transparent). Desktop serves
  `edit-fall-hero-2674.webp` into a 1440x810 box; phone serves
  `edit-fall-hero-mobile-780.webp` into 390x522. Title and "See our picks" are
  legible against the photograph at both widths.

## Notes / follow-ups
- The desktop source is 2674px wide. That is native for a 1440 CSS viewport at
  1.85x and fine for every common display, but it cannot feed a 3840 variant the
  way the lace hero can. If a sharper 4K crop is ever wanted, it needs a bigger
  original, not a bigger width in the widths array.
- The two source PNGs are still in `~/Downloads` — untouched, not moved.

## Third follow-up — the desktop hero brightened

Tina: *"can you make the desktop picture lighter."*

**Measured before touching anything, and the obvious lever was the wrong one.**
The instinct is `heroWash` (the overlay), but the numbers say it barely matters
here: the photograph's own mean luminance is **18.7/255**, and the left-weighted
gradient at 0.26 averages ~0.133 alpha across the frame, so the composited banner
sits at 17.0. Taking the wash to **zero** would only reach 18.6 — a change nobody
could see. The darkness is in the pixels, so the fix had to be too.

Four candidate curves, all measured on the real file:

| transform | mean luminance | pixels ≥250 |
|---|---|---|
| original | 18.7 | 0.000% |
| `modulate({brightness: 1.4})` | 25.3 | 0.249% |
| **`linear(1.2, 12)`** | **34.0** | **0.010%** |
| `linear(1.3, 18)` | 41.9 | 0.167% |

`linear` beats `modulate` because a pure multiply scales the model's already-lit
face by the same factor as the shadows, while the offset lifts the dark painted
backdrop where the tonal range actually is. Compared 1.2/12 against 1.3/18 side
by side as images: the stronger one reaches further but starts to read hazy in
the shadows, so 1.2/12 it is. Nearly double the brightness, no meaningful
highlight clipping.

- `public/edit-fall-hero-2.jpg` — new filename, not an edit in place (§10.21).
  Registered in `scripts/optimise-images.mjs`; six variants written, all fetched
  and 200 from a `next start` build.
- `lib/edits.ts` → `image: '/edit-fall-hero-2.jpg'`. `heroWash` untouched at the
  0.26 default — with a lighter photograph the white type needs it more, not
  less.
- **Desktop only, as asked.** `imageMobile` is still the original grade. If the
  two should match, the phone crop needs the same treatment and its own new
  filename; say the word.
- `edit-fall-hero.jpg` and its six variants stay on disk, unreferenced —
  the same convention `hero-home-2.jpg` already documents in that script
  (cheap, reversible, and anyone holding the old URL from the last four hours
  still gets a file).

Re-verified: tsc clean, lint clean, 773 tests, build clean, banner screenshotted
at 1440 with the stylesheet assertion.

## Fourth follow-up — rebuilt at max quality (and the answer was no)

Tina: *"did you upload the pictures with max quality and can you revert back the
brightness"*, then *"or dont revert the brightness"*. So: brightness KEPT,
quality redone.

**The honest answer to the question was no**, and the defect was mine. What was
being served went through three lossy generations:

    her PNG → jpg q92 → brighten → jpg q95 → webp q95

The `q92` step was pure waste. It existed only because the first conversion
picked a number rather than thinking about it: nothing needed a JPEG at that
point, since the WebP variants could have come straight off the PNG.

Measured, greyscale RMSE against a WebP made in ONE step from the PNG, at the
widths actually served:

| variant | RMSE at 1440 | RMSE at 2400 |
|---|---|---|
| what was live | 1.162 | 1.409 |
| via a q100 4:4:4 JPEG master | 0.944 | 1.116 |
| one step from the PNG | 0 | 0 |

Small — under half a level out of 255 — but paid for nothing.

**Rebuilt.** `edit-fall-hero-3.jpg` and `edit-fall-hero-mobile-2.jpg`, new
filenames per §10.21, each one step from Tina's original PNG. The committed
`.webp` variants were likewise generated in one step from those PNGs, at **webp
quality 100** (was 95). Desktop keeps the `linear(1.2, 12)` lift; the phone crop
stays the original grade, as before.

Cost: the eleven variants total 5.36 MB, against 2.35 MB for the pair they
replace. Worth naming plainly — quality 100 roughly doubles the bytes for a
difference of about 0.1 RMSE on its own, so **the win here is the removed JPEG
middleman, not the quality number.** Say the word and 95 comes back at half the
weight.

**Masters are deliberately not in the repo.** Lossless would be 4.3 MB (desktop)
and 14.4 MB (phone); near-lossless 3.1 / 10.4 MB. Not proportionate for two
banner photographs. The consequence is written into
`scripts/optimise-images.mjs` rather than left implicit: re-running that script
regenerates the variants from the committed `.jpg`, which costs ~1.1 RMSE against
what is committed now. Invisible, but not identical — rebuild from the original
PNGs if byte-identical output ever matters. The script already fails loudly on a
missing input, so neither path can degrade silently.

Verified: tsc clean, lint clean, **773 tests pass**, build clean, all ten new
asset URLs return 200, and the banner renders `edit-fall-hero-3-2400.webp` on
desktop / `edit-fall-hero-mobile-2-780.webp` on phone.

Two things that went wrong while verifying, both harness rather than site:
- One test run showed `1 failed` — `compactCatalogue` "round-trips every
  published product" timing out at 5000ms while a `sharp` job and a build were
  running alongside it. Re-run on an idle machine: 33/33, then 773/773. Not a
  regression, and worth knowing that test is load-sensitive.
- `next start` returned `000` on every asset because another session's build had
  emptied `.next` underneath it — §10.28 rule 4, exactly as written.

---

## Update, same day — the brightness lift is REMOVED (`-4`)

Tina reversed the decision: *"we made the picture of the fall essentials lighter
i dont want that anymore can u fix that its the desptop version"*.

### Why this is not a revert to `edit-fall-hero.jpg`

That would have been the obvious move and it is wrong. `-1` carries the
pointless q92 JPEG middleman that `-3` exists to have removed, so reverting the
filename would have quietly handed back the quality win along with the grade —
two decisions undone when only one was asked for.

`edit-fall-hero-4.jpg` is instead **`-3` minus the lift**: Tina's own
`~/Downloads/magnific_uitbreiden_DomU6wcpcl.png`, one lossy step, ungraded, webp
quality 100 with a mozjpeg q95 `.jpg` fallback. The grade goes back, the quality
stays.

### Measured, so "the brightening is gone" is a number

Mean greyscale luminance, 0–255, against the source PNG at each width actually
served:

| width | source PNG | `-4` (new) | `-3` (previous) |
|---|---|---|---|
| 640 | 24.42 | 25.08 (+0.66) | 41.69 (+17.27) |
| 1024 | 24.42 | 24.61 (+0.19) | 41.11 (+16.69) |
| 1440 | 24.42 | 24.64 (+0.22) | 41.14 (+16.72) |
| 1920 | 24.42 | 24.65 (+0.23) | 41.14 (+16.72) |
| 2400 | 24.42 | 24.65 (+0.23) | 41.14 (+16.72) |
| 2674 | 24.42 | 24.66 (+0.24) | 41.16 (+16.74) |

Full-size `.jpg`: PNG 24.42 → `-4` 24.39, a drift of **0.028**, which is JPEG
rounding rather than a grade. `-3` was **+16.40**.

640 drifts a little further than the rest because a 4.2x downscale averages the
frame differently. It is resampling, not a grade.

### The phone crop is untouched

`edit-fall-hero-mobile-2.jpg` stays. It was never brightened — the lift was
asked for on the desktop picture — so there was nothing on it to undo. A side
effect worth naming: desktop and phone now carry the **same** grade again, which
they did not between `-2` and `-3`.

### Files

- `public/edit-fall-hero-4.jpg` + six `.webp` variants (640…2674), each built in
  ONE step from the PNG. New filenames per §6/§10.21 — `public/` is served with a
  4h cache and is not fingerprinted, so new bytes at an old path are invisible to
  anyone who already loaded the page.
- `scripts/optimise-images.mjs` — `-4` registered as CURRENT, `-3` marked
  superseded and left registered (same convention as `-1` and `-2`).
- `lib/edits.ts` — `image` now `/edit-fall-hero-4.jpg`.

Superseded files are deliberately **not deleted** from `public/`: anyone holding
a cached page still references them for up to 4h.

### Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · `npm test` → **48 files, 781 tests
passing**. `lib/staticImage.test.ts` is the load-bearing one here: it fails if an
original has no variants on disk, so a mis-named variant could not pass silently.

Rendered against a local production build at 1440x900 @2x and looked at:

```
css: rgb(250, 247, 241)          <- --parchment, so the CSS really loaded
currentSrc: /edit-fall-hero-4-2674.webp
broken: false   console errors: 0   failed requests: 0
```

One misread while verifying, recorded because the first reading looked like a
defect: the probe reported `naturalWidth 1440` on a file named `-2674`. The files
on disk are correct (`sips` confirms 2674x1504); `naturalWidth` was sampled while
the browser was still swapping candidates. Checking the actual files settled it
in one command — §10.26, ask what the harness would have to be doing wrong before
believing a finding.

## Fifth follow-up — cropped to the mouth (and a clobber to own up to)

Tina: *"can we zoom in on the picture i ony want to see her lips and bit of
nose."* Asked which surfaces, since one file feeds both the homepage banner and
the edit page — she said both.

### The mistake, first

Picking the next unused filename, I wrote `public/edit-fall-hero-4.jpg`. **It was
not unused.** A concurrent session had created and committed that exact file
minutes earlier (`37e5460`), because Tina had told *that* session she no longer
wanted the brightness lift. `sharp().toFile()` overwrote their un-graded hero and
its four variants with my brightened crop, silently.

It surfaced only because a later scripted edit to `lib/edits.ts` failed an
`assert` — the text I expected had been replaced by comments I had never written.
Without that assert I would have committed the clobber.

Two errors, not one: I chose a filename from a stale read of the directory, and I
had not noticed Tina reversing the brightness decision in another thread — so my
crop still carried the `linear(1.2, 12)` lift she had just asked to remove.

`git checkout --` restored all five of their files from `37e5460`; their commit
was never touched. Logged as §10.40 in CLAUDE.md.

### The crop

Rebuilt as `edit-fall-hero-5.jpg` / `edit-fall-hero-mobile-4.jpg`, **ungraded** —
recropping is not a reason to hand back a decision she has undone.

Both crops come from the SAME original now (the 3584x4800 portrait, which has by
far the most pixels for a crop this tight), so desktop and phone are the same
grade by construction rather than by coincidence — the drift between them in the
-2/-3 era is exactly what that fixes. Real detail: 320x180 desktop, 300x402
phone. Everything served is an upscale of that, so the width lists stop at 1920
and 1170 and the WebP quality is 95, not 100 — past those, bytes buy invented
pixels.

### The wash had to move, and measuring caught it

The default `heroWash` of 0.26 was tuned for the full-frame shot, where the copy
sat over a dark painted backdrop. The crop puts it over **lit skin**. Worst-case
WCAG contrast for the white copy, sampling the brightest pixel behind each text
element with the text hidden:

| heroWash | homepage desktop | edit page desktop |
|---|---|---|
| 0.26 (default) | **3.66 FAIL** | **4.39 FAIL** |
| **0.40** | **5.16 pass** | **6.01 pass** ← shipped |
| 0.50 | 6.63 pass | 7.63 pass |
| 0.60 | 8.62 pass | 9.64 pass |

Phones pass at every level. Took the LOWEST value clearing 4.5 with real margin
rather than the safest one, because Tina has just reversed a brightness lift on
this photograph and darkening it further than legibility requires would be
walking back her decision by another route.

**The first run of that measurement was void and looked completely fine** — it
reported an identical number at every wash level and named text ("Shop the
Archive") that is not in this banner, because the selector had scoped to the
wrong section. A contrast figure that does not move when you move the scrim is
not a measurement (§10.28). Re-scoped by walking up from the image itself rather
than from a link, since there are two `/edits/fall-essentials` anchors on the
homepage and `querySelector` takes the first.

Verified: tsc clean, lint clean, build clean; homepage serves
`edit-fall-hero-5-1920.webp` desktop / `edit-fall-hero-mobile-4-780.webp` phone,
edit page serves `edit-fall-hero-5-1920.webp`.

## Sixth follow-up — the crop was too tight; nose and lips WITH the body

Tina: *"no i meant nose and lips i also wanted to see the body just not the
eyes."* So the frame starts just under the eyes and runs to the hem — nose,
lips, cape, chain belt, bag, trousers.

`edit-fall-hero-6.jpg` / `edit-fall-hero-mobile-5.jpg`.

**Cut from the WIDE original this time, not the portrait one -5 used.** Two
reasons, and the second matters more: the wide file is the only one that holds
the whole figure inside a 16:9 region, and **the two originals are not the same
grade** — measured mean luminance 18.7 (wide) vs 35.0 (portrait). Mixing them
across breakpoints is exactly how the desktop and phone heroes drifted apart
earlier today, so both crops now come from the same file. It is also the ungraded
source behind -4, the revert of the brightness lift, so this does not quietly
hand back a lighter picture through the back door.

Resolution is much better than -5: the desktop region is 1883x1059, a **1.02x**
resize to the 1920 master — effectively native, against -5's 320x180 region and
6x upscale. That is why quality goes back to 100; here there is real detail for
the extra bits to preserve.

### The first composition failed contrast, and the fix was framing, not scrim

Centring the figure put the copy on top of her, not beside her. Measured
worst-case white-text contrast:

| | home desktop | home phone | edit desktop | edit phone |
|---|---|---|---|---|
| centred figure, wash 0.40 | 4.70 | **4.14 FAIL** | **3.59 FAIL** | 5.66 |
| figure right-of-centre, 0.40 | **14.93** | **5.64** | **4.65** | **5.64** |

Shifting the crop window left so the model lands right-of-centre took the
homepage desktop from 4.70 to **14.93** — because the left-weighted wash and the
left-aligned copy now have empty dark foliage to sit on, which is what that wash
was designed for. `lib/edits.ts` already documents this for Everyday Lace ("the
model hard right against an empty door, so left is the only place the type can
go"); this crop had to earn the same property.

`heroWash` stays at **0.40**. All four surfaces pass; the thinnest is the edit
page desktop at 4.65 against a 4.5 threshold, which is worth knowing. Did not
raise it further: darkening the picture beyond what legibility needs would work
against the outfit she asked to be able to see.

Verified: tsc clean, lint clean, tests pass, build clean; homepage serves
`edit-fall-hero-6-1920.webp` desktop / `edit-fall-hero-mobile-5-780.webp` phone,
edit page `edit-fall-hero-6-1920.webp`. Screenshotted all three.

## Seventh follow-up — brighter, both surfaces

Tina, after seeing the body crop: *"can we make it more brighter. liek both."*

`edit-fall-hero-7.jpg` / `edit-fall-hero-mobile-6.jpg` — same crop, same wide
original, identical `linear(1.3, 20)` lift on both so they cannot drift.

| candidate | mean luminance | pixels ≥250 | |
|---|---|---|---|
| -6, as it was | 21.7 | 0.000% | |
| `linear(1.2, 12)` | 37.6 | 0.018% | |
| **`linear(1.3, 20)`** | **47.6** | **0.358%** | shipped |
| `linear(1.45, 28)` | 58.6 | 0.952% | hazy in the shadows |

She reversed a lift of this kind on the FULL-FRAME hero earlier the same day
(-3 → -4). That is not a contradiction to correct later: different picture, and
she asked for this one explicitly, after seeing the crop. Noted in
`lib/edits.ts` so nobody "fixes" it back.

### The wash had to move again — and this is now a pattern

A brighter photograph costs text contrast, so `heroWash` was re-measured rather
than carried over. Worst case across all four surfaces (homepage + edit page ×
desktop + phone):

| heroWash | worst of the four | |
|---|---|---|
| 0.40 (what -6 shipped with) | **2.76 FAIL** | on the edit page desktop |
| 0.50 | **3.81 FAIL** | |
| **0.58** | **5.03 pass** | shipped |
| 0.66 | 6.69 pass | |

**0.40 would have carried over silently and failed on two surfaces.** Third time
today that a photograph change invalidated a contrast figure measured against the
previous one — the satin band, the mouth crop, and now this. The pattern is worth
stating plainly: *any* change to a background photograph invalidates every
contrast number measured against the old one, including ones this file records.

Why this does not undo the brightening: the banner's wash is left-weighted and
the copy is left-aligned, so the heavier scrim lands on the empty backdrop the
type sits on, not on the outfit at the right of the frame. Confirmed by eye at
1440 — foliage, cape and trousers all read markedly lighter than -6.

Verified: tsc clean, lint clean, tests pass, build clean; homepage serves
`edit-fall-hero-7-1920.webp` desktop and `edit-fall-hero-mobile-6-780.webp`
phone.

## Eighth follow-up — "a tiny bit darker", and a real finding on the edit page

Tina: *"a tiny bit darker."* `edit-fall-hero-8.jpg` / `edit-fall-hero-mobile-7.jpg`,
`linear(1.24, 14)` instead of `(1.3, 20)` — mean luminance 47.6 → 40.3, still
nearly double the ungraded 21.7. Candidates: 1.27/17 → 44.0 (barely
distinguishable), 1.24/14 → 40.3 (shipped), 1.20/12 → 37.6 (a bigger step than
"a tiny bit").

### My earlier wash numbers were measured against the wrong thing

Checking contrast on the darker image produced an impossible result — the edit
page came back **worse** (1.60:1) on a *darker* picture than it had on a brighter
one. A darker background cannot reduce contrast against white text, so the
measurement had to be wrong, not the site.

It was. The sweep probe overrode each scrim with a **flat** `rgba(12,6,12,W)`,
but the page actually renders a left-weighted **gradient** — so every "heroWash"
figure in the two previous entries describes an even-wash configuration that was
never shipped. The real page, unoverridden, is:

| surface | real contrast at heroWash 0.58 |
|---|---|
| homepage desktop | 9.76 pass |
| homepage phone | 4.09 FAIL |
| **edit page desktop** | **1.60 FAIL** |
| edit page phone | 4.11 FAIL |

**Root cause is layout, not the scrim.** The edit page centres its `h1`, so the
tail of "Fall Essentials" crosses the model's cream sleeve and pale hijab, where
the left-weighted gradient has already faded to 0.02. `lib/edits.ts` documents
this exact hazard on `heroWashEven` — "wrong when the type is CENTRED" — and this
crop is the case it warns about.

A flat wash fixes it, measured properly this time (scrims tagged once, before
mutation, so the selector cannot stop matching):

| flat wash | min across all four surfaces |
|---|---|
| 0.40 | 2.93 FAIL |
| 0.50 | 4.02 FAIL |
| **0.60** | **5.62 PASS** |
| 0.70 | 8.24 PASS |

**Tina chose the even wash**, from four options put to her (even wash / deepen the
title's drop shadow only / reframe so she sits further right / leave it). So
`heroWash: 0.60` + `heroWashEven: true`. The cost was stated before she chose it:
a flat wash darkens the WHOLE photograph, including the outfit, walking back some
of the brightness she had spent several rounds tuning.

Verified on the real page afterwards, with no scrim override — the probe now
prints the computed scrim so the reading cannot be confused with an overridden
one again. It reads `rgba(12, 6, 12, 0.6)` with no gradient, i.e. what actually
ships:

| surface | contrast |
|---|---|
| homepage desktop | 14.88 pass |
| homepage phone | 6.49 pass |
| edit page desktop | 5.62 pass |
| edit page phone | 6.49 pass |

Two harness faults hit while getting there, both caught rather than believed:
`next start` served a build with **no CSS** (another session had rebuilt into the
shared `.next` — §10.28 rule 4), caught by the stylesheet assertion; and one
`npm run lint` reported "too many warnings" and then exited 0 on an immediate
re-run, almost certainly a file mid-write from the same session.

### Second probe bug, caught by its own guard

The first flat-wash sweep reported an identical figure at every level. It
re-selected scrims each round by their background containing `rgba(12, 6, 12` —
so once round one wrote a flat colour, `backgroundImage` became `none` and
nothing matched again. The `identical at every level → VOID` check caught it;
without that it would have read as a clean, flat result. Same family as §10.28.
The fixed probe tags the scrims once, up front, and now hard-throws on a void
run instead of printing numbers.
