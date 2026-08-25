// Generate web-sized WebP variants of the static images in public/.
//
//   node scripts/optimise-images.mjs           # write variants, print the saving
//   node scripts/optimise-images.mjs --dry     # report only, touch nothing
//
// WHY: measured 2026-08-07 on the homepage at iPhone 13 width, the local assets
// were a bigger problem than the hotlinked Shopify ones. /style-it/dress_0.png
// was 446KB to fill a 145px box; /logo.png was 308KB to fill 34px, on every page
// of the site.
//
// This NEVER overwrites an input. Every output gets a new filename (.webp, and a
// width suffix where there are several), because public/ is served by Railway
// with `cache-control: public, max-age=14400` and Next does not fingerprint
// these paths — so new bytes at an old path are invisible for four hours to
// anyone who already loaded the page. See CLAUDE.md §6 and §10.21.
//
// Idempotent: an output that is already newer than its input is skipped, so
// re-running is cheap and safe.
import sharp from 'sharp';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry');
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

/** Cutouts and photographs are different problems, so they get different rules. */
const JOBS = [
  {
    // Transparent PNG cutouts. They render between 94px and ~300px wide, and the
    // originals are already only 350–700px, so the saving is the FORMAT, not a
    // downscale — 700 is a ceiling that in practice almost never bites.
    dir: 'style-it',
    match: /\.png$/i,
    widths: [700],
    suffixWidth: false,
    opts: { quality: 82, alphaQuality: 90, effort: 5 },
  },
  {
    // The crest. Rendered 34px wide in the header; 240 is generous even at 3x.
    file: 'logo.png',
    widths: [240],
    suffixWidth: true,
    opts: { quality: 90, alphaQuality: 95, effort: 6 },
  },
  {
    // Editorial photography. 1696px originals, and one of them renders into an
    // 84px thumbnail on the homepage. Two widths: the card and the thumb.
    dir: 'editorial',
    match: /\.jpe?g$/i,
    widths: [400, 900],
    suffixWidth: true,
    opts: { quality: 80, effort: 5 },
  },
  {
    // Full-bleed hero. Needs a real responsive set: it is the LCP element on a
    // phone, where a 390px viewport was being sent a 1920px JPEG.
    file: 'hero-home.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // First replacement hero photo Tina supplied 2026-08-20 — superseded by
    // hero-home-3.jpg the same day (see that entry). Left registered/
    // generated rather than removed, same reasoning as leaving
    // hero-home.jpg's own variants in place: unreferenced, cheap, reversible.
    file: 'hero-home-2.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // Second replacement, 2026-08-20 (see that day's log entry) — superseded
    // the same day by hero-home-4.jpg's Magnific upscale. Left registered
    // for the same reason hero-home.jpg and hero-home-2.jpg still are:
    // unreferenced, cheap to keep, reversible.
    file: 'hero-home-3.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // Magnific upscale in use for part of 2026-08-21, superseded the same
    // day by hero-home-5.jpg's 21:9 crop of this same file. Left registered,
    // same "cheap to keep, reversible" reasoning as every prior hero file.
    file: 'hero-home-4.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // 21:9 crop, live for part of 2026-08-21, superseded the same day by
    // hero-home-6.jpg's 16:9 ("nevermind lets go back to 16:9"). Left
    // registered, same reasoning as every prior hero file.
    file: 'hero-home-5.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // 16:9 crop, live for most of 2026-08-21 (hero-home-7.jpg, a native
    // 21:9 photo, was tried and reverted the same session first) —
    // superseded the same day by hero-home-8.jpg, a genuine 21:9 CROP of
    // this exact file (top-trimmed, not resized/stretched). quality 78->92
    // and a 2400 width were added here first ("i want better quality") and
    // carried straight into hero-home-8's own job below rather than
    // rediscovered.
    file: 'hero-home-6.jpg',
    widths: [640, 1024, 1440, 1920, 2400],
    suffixWidth: true,
    opts: { quality: 92, effort: 5 },
  },
  {
    // Native 21:9 photo, tried and reverted within minutes the same session
    // ("nevermind revert back") in favour of the OTHER photo (hero-home-6),
    // which was then itself cropped to 21:9 below rather than this file
    // being revisited.
    file: 'hero-home-7.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // Landed twice, reverted once, then superseded by hero-home-9.jpg's
    // smaller crop — Tina, seeing this 732px version live: "thats too much
    // and doont zoom in." Left registered/generated, not referenced.
    file: 'hero-home-8.jpg',
    widths: [640, 1024, 1440, 1920, 2400],
    suffixWidth: true,
    opts: { quality: 92, effort: 5 },
  },
  {
    // The hero photo in use as of 2026-08-21 — Tina, after hero-home-8.jpg
    // (732px trimmed off hero-home-6.jpg's top): "thats too much and doont
    // zoom in." Same file, same TOP-only crop direction, far less of it:
    // 250px trimmed (5461x3072 -> 5461x2822, aspect 1.9352 — nowhere near
    // 21:9, and not aiming to be; the amount was picked by rendering the
    // crop and looking at it, not by targeting a ratio). "Don't zoom in"
    // carries over into app/page.tsx too: no objectPosition or transform
    // override on this file, on top of the physical crop already being
    // modest enough not to need one.
    file: 'hero-home-9.jpg',
    widths: [640, 1024, 1440, 1920, 2400],
    suffixWidth: true,
    opts: { quality: 92, effort: 5 },
  },
  {
    // 2026-08-21, later the same day — Tina: "cut off the top and bottom a
    // little bit so the text is in the middle." Object-cover on this hero
    // is height-constrained at every real viewport (the source is 1.94:1,
    // wider than any device/hero-vh box), so the FULL source height always
    // maps 1:1 to the box — nothing is vertically cropped by CSS. That
    // means the fixed-position text overlay sat at a fixed fraction of a
    // frame with a chandelier already touching the top edge and a lot of
    // plain floor at the bottom, which read as unbalanced even though the
    // pixel split was close to symmetric — the floor carries far less
    // visual weight than the chandelier, so equal pixels didn't look equal.
    // 100px trimmed off the top (chandelier already meets the edge, so not
    // more than this) and 250px off the bottom (dead floor, the one place
    // with real room) — 5461x2822 -> 5461x2472. Same TOP+BOTTOM trim
    // direction as hero-8/hero-9, just on both edges instead of one.
    file: 'hero-home-10.jpg',
    widths: [640, 1024, 1440, 1920, 2400],
    suffixWidth: true,
    opts: { quality: 92, effort: 5 },
  },
  {
    // /edits/everyday-lace hero, desktop. v2, 2026-08-24: Tina supplied a
    // Magnific upscale at 5504x3072, replacing the 1672x941 original whose
    // ceiling meant no variant above 1672 and a visibly soft phone crop.
    // NEW FILENAME rather than overwriting — public/ is served with a 4h cache
    // and is not fingerprinted, so new bytes at an old path are invisible to
    // anyone who already loaded the page (§6, §10.21).
    // Quality 95 / effort 6, and widths up to 3840 — Tina asked for the highest
    // quality upload. The source is 5504px so every width here is real
    // downscaling, never an upscale. 3840 covers a 1920 CSS viewport at 2x DPR,
    // which is the widest common case; going to the native 5504 would add
    // megabytes for a difference no display can resolve.
    file: 'edit-lace-hero-v2.jpg',
    widths: [640, 1024, 1440, 1920, 2400, 3200, 3840],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // Same hero, phone. v2 is 1920x2571 — a genuinely different SHAPE from the
    // v1 crop, 0.7468 rather than 5/8 (0.625). The page's mobile ratio was
    // changed to match it exactly rather than the image being cropped to fit
    // the old one; see the --edit-hero-ratio custom properties in
    // components/EditBanner.tsx and app/edits/[slug]/page.tsx.
    // 1170 covers a 390px CSS phone at 3x DPR, which the 588px v1 crop could
    // not — that was a ~2x stretch.
    // Same quality bump. 1920 is the source's own width, so this set already
    // tops out at native — there is nothing above it to add.
    file: 'edit-lace-hero-mobile-v2.jpg',
    widths: [390, 780, 1170, 1560, 1920],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // /edits/jersey-hijabs hero, desktop. Back to the 1672x941 original,
    // 2026-08-25 — a 2048px v2 was tried and rejected the same day. Quality 95
    // as everywhere else; the SOURCE is the ceiling here, not the compression,
    // so there is no variant above 1672.
    file: 'edit-jersey-hero.jpg',
    widths: [640, 1024, 1440, 1672],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // Same hero, phone — the 1792x2400 portrait, native at every phone width.
    file: 'edit-jersey-hero-mobile.jpg',
    widths: [390, 780, 1170, 1560, 1792],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop — Tina's own shot, 2026-08-25,
    // replacing the placeholder that reused the lace hero. Source is
    // 2674x1504 (1.77793), so 2674 is the ceiling and this script never
    // upscales: asking for 3200/3840 like the lace hero does would silently
    // write nothing and leave a 404 in the srcset. Quality 95, as every other
    // hero.
    file: 'edit-fall-hero.jpg',
    widths: [640, 1024, 1440, 1920, 2400, 2674],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // Same shot, brightened — Tina, 2026-08-25: "can you make the desktop
    // picture lighter". Deliberately a NEW FILE rather than an edit in place
    // (§6/§10.21), and deliberately not a change to `heroWash`: the overlay was
    // measured first and is not what makes this banner dark. The photograph's
    // own mean luminance is 18.7/255, and dropping the wash from 0.26 to zero
    // moves the composited banner from 17.0 to 18.6 — invisible. So the lift
    // has to be in the pixels.
    //
    // `linear(1.2, 12)`: a slope AND an offset, not `modulate({brightness})`.
    // A pure multiply scales the model's already-bright face by the same factor
    // as the shadows; the offset lifts the dark painted backdrop where the
    // range actually is. Measured across four candidates — this lands mean
    // luminance at 34.0 (from 18.7) with 0.010% of pixels at 250+, i.e. no
    // meaningful highlight clipping. The next step up (1.3/18) reaches 41.9 but
    // starts to read hazy in the shadows.
    //
    // DESKTOP ONLY, as asked — edit-fall-hero-mobile.jpg is untouched.
    //
    // SUPERSEDED by edit-fall-hero-3.jpg below, 2026-08-25. -2 was built from
    // the -1 JPEG rather than from Tina's PNG, so the served pixels had been
    // through THREE lossy generations. Left registered rather than deleted,
    // same convention as hero-home-2.jpg above.
    file: 'edit-fall-hero-2.jpg',
    widths: [640, 1024, 1440, 1920, 2400, 2674],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop. Tina: "did you upload the
    // pictures with max quality", then "or dont revert the brightness", so this
    // is the SAME `linear(1.2, 12)` lift as -2, rebuilt properly.
    //
    // SUPERSEDED by edit-fall-hero-4.jpg below, 2026-08-25 — Tina reversed the
    // brightness decision: "we made the picture of the fall essentials lighter
    // i dont want that anymore ... its the desptop version". Left registered
    // rather than deleted, same convention as -1 and -2 above.
    //
    // What was wrong with -2, measured rather than asserted. Its chain was
    // PNG -> jpg q92 -> brighten -> jpg q95 -> webp q95: three lossy
    // generations, and the q92 step was pure waste — it existed only because
    // the first conversion picked a number instead of thinking. Greyscale RMSE
    // against a webp made in one step from the PNG, at the widths actually
    // served: 1.409 at 2400px, 1.162 at 1440px. Small, but paid for nothing.
    //
    // The committed .webp variants beside this file were generated in ONE step
    // straight from Tina's original
    // (~/Downloads/magnific_uitbreiden_DomU6wcpcl.png) at webp quality 100,
    // and the .jpg here is likewise one step from that PNG. Masters are not in
    // the repo — lossless would be 4.3MB desktop and 14.4MB phone, which is not
    // proportionate for two banner photographs.
    //
    // CONSEQUENCE, so nobody is surprised: re-running THIS script regenerates
    // the variants from the .jpg, not from the PNG, which costs about 1.1 RMSE
    // against the committed ones — invisible, but not identical. If you need
    // them byte-perfect, rebuild from the original PNG. The script errors loudly
    // on a missing input, so nothing here can fail silently either way.
    file: 'edit-fall-hero-3.jpg',
    widths: [640, 1024, 1440, 1920, 2400, 2674],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop — CURRENT. Tina, 2026-08-25: "we
    // made the picture of the fall essentials lighter i dont want that anymore
    // can u fix that its the desptop version".
    //
    // So this is -3 with the `linear(1.2, 12)` lift REMOVED — her own PNG, in
    // one lossy step, ungraded. It is not a revert to -1: that file kept the
    // pointless q92 JPEG middleman this line of files exists to have removed.
    // The grade goes back, the quality win stays.
    //
    // Measured mean greyscale luminance, 0-255, against the source PNG at each
    // width actually served, so "the brightening is gone" is a number and not
    // a claim:
    //   width  PNG    this (-4)      previous (-3)
    //    640   24.42  25.08 (+0.66)  41.69 (+17.27)
    //   1024   24.42  24.61 (+0.19)  41.11 (+16.69)
    //   1440   24.42  24.64 (+0.22)  41.14 (+16.72)
    //   1920   24.42  24.65 (+0.23)  41.14 (+16.72)
    //   2400   24.42  24.65 (+0.23)  41.14 (+16.72)
    //   2674   24.42  24.66 (+0.24)  41.16 (+16.74)
    // The residual quarter-point is resampling and WebP rounding. 640 drifts a
    // little further because an 4.2x downscale averages the frame differently;
    // it is not a grade.
    //
    // Built ONE step from ~/Downloads/magnific_uitbreiden_DomU6wcpcl.png at
    // webp quality 100, .jpg fallback at mozjpeg q95. The same regeneration
    // caveat as -3 applies: re-running THIS script rebuilds the variants from
    // the .jpg, not from the PNG. Rebuild from the PNG if that matters.
    //
    // The PHONE crop is untouched and stays edit-fall-hero-mobile-2.jpg — it
    // was never brightened, so there is nothing on it to undo.
    file: 'edit-fall-hero-4.jpg',
    widths: [640, 1024, 1440, 1920, 2400, 2674],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // Same hero, phone — 3584x4800 portrait, 0.74667. Effectively the same
    // shape as the lace phone hero (0.7468), so it needs no new ratio handling
    // in EditBanner. Stops at 1920: that is a 640px CSS viewport at 3x DPR,
    // well past any phone, and the source has plenty of headroom above it.
    // SUPERSEDED by edit-fall-hero-mobile-2.jpg below, 2026-08-25 — same
    // q92-JPEG-middleman problem as the desktop one. Left registered.
    file: 'edit-fall-hero-mobile.jpg',
    widths: [390, 780, 1170, 1560, 1920],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // Same hero, phone — CURRENT. Original grade, NOT brightened: the lift was
    // asked for on the desktop picture specifically. Rebuilt from
    // ~/Downloads/magnific_upscaler_bxlcMFP5Y2.png in one step; see the desktop
    // entry above for the full reasoning and the regeneration caveat.
    file: 'edit-fall-hero-mobile-2.jpg',
    widths: [390, 780, 1170, 1560, 1920],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop — the CROP. Tina: "can we zoom in on
    // the picture i ony want to see her lips and bit of nose", and, asked
    // because one file feeds two surfaces, both of them.
    //
    // NOT graded. -4 above exists precisely because she reversed the brightness
    // lift the same day, so this crop is ungraded too — a crop is not a licence
    // to reintroduce a decision she has already undone.
    //
    // Cropped from the PORTRAIT original (magnific_upscaler_bxlcMFP5Y2.png,
    // 3584x4800) rather than the wide one: at this tightness the only thing
    // that matters is how many real pixels the region has, and the portrait
    // has far more. The region is 320x180 — that is ALL the real detail there
    // is, so every width below is an upscale and the list stops at 1920
    // deliberately. Past that is bytes spent on invented pixels. Quality 95 not
    // 100 for the same reason: an upscale has no fine detail left for the extra
    // bits to preserve.
    // SUPERSEDED by edit-fall-hero-6.jpg below — the mouth-only crop was too
    // tight. Tina: "no i meant nose and lips i also wanted to see the body
    // just not the eyes." Left registered, same convention as -1/-2/-3.
    file: 'edit-fall-hero-5.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop — CURRENT. Crops the top of the
    // frame just below the eyes and keeps everything down to the hem: nose,
    // lips, cape, chain belt, bag, trousers.
    //
    // Cut from the WIDE original this time (magnific_uitbreiden_DomU6wcpcl.png),
    // NOT the portrait one -5 used. Two reasons, and the second is the
    // important one: the wide file is the only one that holds the whole figure
    // inside a 16:9 region, AND the two originals are not the same grade —
    // measured mean luminance 18.7 (wide) against 35.0 (portrait). Mixing them
    // across breakpoints is exactly how the desktop and phone heroes drifted
    // apart earlier today. The phone crop below comes from this same wide file
    // for that reason, so the two match by construction.
    //
    // Using the wide file also keeps the grade Tina settled on: it is the
    // ungraded source behind -4, the revert of the brightness lift. Reaching
    // for the portrait file would have quietly handed back a lighter picture.
    //
    // Region is 1883x1059, so the 1920 master is a 1.02x resize — effectively
    // native, unlike -5's 320x180 region. That is why quality goes back to 100:
    // here there is real detail for the extra bits to preserve.
    // SUPERSEDED by edit-fall-hero-7.jpg below — Tina: "can we make it more
    // brighter. liek both". Left registered, same convention as -1..-5.
    file: 'edit-fall-hero-6.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop — CURRENT. Same crop as -6, lifted
    // with `linear(1.3, 20)`: mean luminance 21.7 -> 47.7, with 0.36% of pixels
    // at 250+ (no meaningful clipping). Measured against three candidates —
    //   linear(1.2, 12)   37.6   0.018% clipped
    //   linear(1.3, 20)   47.6   0.358%   <- shipped
    //   linear(1.45, 28)  58.6   0.952%   reads hazy in the shadows
    //
    // NOTE this is the same kind of lift she reversed on the FULL-FRAME hero
    // earlier the same day (-3 -> -4). Not a contradiction and not a mistake to
    // correct later: that was a different picture, and she asked for this one
    // explicitly and after seeing the crop. An offset rather than a brightness
    // multiply, for the reason spelled out on -3: the range that needs lifting
    // is the dark painted backdrop, not her already-lit face.
    // SUPERSEDED by edit-fall-hero-8.jpg below — Tina: "a tiny bit darker".
    file: 'edit-fall-hero-7.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // /edits/fall-essentials hero, desktop — CURRENT. `linear(1.24, 14)`:
    // mean luminance 40.3, a small step down from -7's 47.6 while still nearly
    // double the ungraded 21.7. Candidates measured before choosing —
    //   1.30, 20   47.6   (-7, "a tiny bit" too bright)
    //   1.27, 17   44.0   barely distinguishable from -7
    //   1.24, 14   40.3   <- shipped
    //   1.20, 12   37.6   reads as a bigger step than "a tiny bit"
    file: 'edit-fall-hero-8.jpg',
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // Same crop, phone — 300x402 from the SAME original, so the two surfaces
    // are the same grade by construction rather than by coincidence. (Before
    // this, desktop and phone came from two different Magnific outputs, which
    // is how they drifted apart in the first place.) Stops at 1170: a 390px CSS
    // phone at 3x DPR.
    // SUPERSEDED by edit-fall-hero-mobile-5.jpg below. Left registered.
    file: 'edit-fall-hero-mobile-4.jpg',
    widths: [390, 780, 1170],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // Same crop, phone — CURRENT. 790x1059 out of the SAME wide original as the
    // desktop one, so the grade matches by construction rather than by luck.
    // 1.48x to the 1170 master; 1170 is a 390px CSS phone at 3x DPR.
    // SUPERSEDED by edit-fall-hero-mobile-6.jpg below. Left registered.
    file: 'edit-fall-hero-mobile-5.jpg',
    widths: [390, 780, 1170],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // Same crop and the SAME lift as the desktop one — "liek both". Both still
    // cut from the one wide original, so the two stay matched by construction.
    // SUPERSEDED by edit-fall-hero-mobile-7.jpg below. Left registered.
    file: 'edit-fall-hero-mobile-6.jpg',
    widths: [390, 780, 1170],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // Same crop, same lift as the desktop one — the two are always changed
    // together and always cut from the one wide original.
    file: 'edit-fall-hero-mobile-7.jpg',
    widths: [390, 780, 1170],
    suffixWidth: true,
    opts: { quality: 100, effort: 6 },
  },
  {
    // The homepage "Apply for the seal" band's satin background, 2026-08-25.
    // Tina's file, ROTATED 90 degrees: hers is 3927x5891 portrait and the band
    // is wide and short, so upright it would have shown a narrow vertical slice
    // rather than the folds. The committed .webp variants were generated in one
    // step from her original ~/Downloads/pexels-karola-g-4863034.jpg; the same
    // regeneration caveat as the fall hero above applies.
    file: 'seal-band-satin.jpg',
    widths: [640, 1024, 1440, 1920, 2400],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // REPLACED seal-band-satin above on 2026-08-25, same day. Tina swapped the
    // plum satin macro for her own generated image, drapery framing a bright
    // cream centre, and asked for the copy in that centre — which inverted every
    // text colour on the band. Her original is
    // ~/Downloads/Satijngolven in aubergine, bessen en lila.png, 1672x941; the
    // committed .webp variants were generated in one step from THAT, not from
    // the .jpg beside them, so re-running this script rebuilds them from the
    // JPEG and will not be bit-identical. Same caveat as the fall hero.
    // 1672 is the source's own width — this script never upscales, so there is
    // no point asking for more.
    file: 'seal-band-drape.jpg',
    widths: [640, 1024, 1440, 1672],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // /edits/[slug] story photographs — the credited street shots that sit with
    // the styling text. Rendered ~300-420px wide in a strip, so 400/800 covers
    // 1x and 2x; 1200 is there for the phone case where one card is nearly the
    // full viewport. Sources are 736-1200px, and this script never upscales, so
    // the 1200 variant only materialises for the two that can supply it.
    dir: 'edits',
    match: /\.jpe?g$/i,
    widths: [400, 800, 1200],
    suffixWidth: true,
    opts: { quality: 86, effort: 5 },
  },
  {
    // Full-bleed band on /about. Same job as the hero — it spans the viewport,
    // so the 900px editorial ceiling is visibly soft on a desktop display.
    dir: 'about',
    match: /\.jpe?g$/i,
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
  {
    // Phone-specific hero crop, 2026-08-22 — Tina supplied a genuine 9:16
    // portrait shot (1728x3072, same two models/setting as hero-home-10.jpg)
    // rather than letting `object-cover` crop the 1.94:1 landscape hero down
    // to a tall phone box, which was upscaling past the source's native
    // resolution on a 390px-wide viewport (measured: object-cover needed the
    // image at ~1864px wide to cover a 390x844 box, wider than the 1440px
    // variant being served). Widths cover phone viewports up to ~430px CSS at
    // up to 3x DPR (430*3=1290); nothing wider, because app/page.tsx's
    // <picture> only serves this below the 768px breakpoint — the desktop
    // hero-home-10 variants take over above it.
    file: 'hero-home-mobile.png',
    widths: [640, 828, 1080, 1290],
    suffixWidth: true,
    opts: { quality: 88, effort: 5 },
  },
  {
    // Curated "By category" showcase on the homepage, 2026-08-23 — Tina
    // supplied one photo each for Dresses/Co-ord Sets/Skirts/Abayas/Tops/
    // Activewear (replacing the auto-picked-from-catalogue photos), with a
    // reference mosaic layout to match. Cards render up to ~700px wide in
    // the 3-column grid; 1000 covers 2x DPR at that size.
    dir: 'category',
    match: /\.png$/i,
    widths: [400, 700, 1000],
    suffixWidth: true,
    opts: { quality: 85, effort: 5 },
  },
];

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
let before = 0;
let after = 0;

async function convert(inPath, outPath, width, opts) {
  const src = await stat(inPath);
  const meta = await sharp(inPath).metadata();
  // Never upscale: a 438px cutout asked for at 700 stays 438.
  const target = Math.min(width, meta.width ?? width);

  if (existsSync(outPath)) {
    const out = await stat(outPath);
    if (out.mtimeMs >= src.mtimeMs) {
      after += out.size;
      before += src.size;
      console.log(`  skip  ${outPath.replace(PUBLIC, '')}  (up to date, ${kb(out.size)})`);
      return;
    }
  }

  if (DRY) {
    console.log(`  would write ${outPath.replace(PUBLIC, '')} @ ${target}px`);
    return;
  }

  await sharp(inPath).resize({ width: target, withoutEnlargement: true }).webp(opts).toFile(outPath);
  const out = await stat(outPath);
  before += src.size;
  after += out.size;
  const pct = (100 - (out.size / src.size) * 100).toFixed(0);
  console.log(`  ${outPath.replace(PUBLIC, '').padEnd(34)} ${kb(src.size).padStart(7)} -> ${kb(out.size).padStart(7)}  (-${pct}%)`);
}

for (const job of JOBS) {
  const files = job.dir
    ? (await readdir(new URL(`../public/${job.dir}/`, import.meta.url)))
        .filter((f) => job.match.test(f))
        .map((f) => `${job.dir}/${f}`)
    : [job.file];

  console.log(`\n${job.dir ?? job.file}`);
  if (job.dir) await mkdir(`${PUBLIC}${job.dir}`, { recursive: true });

  for (const rel of files) {
    const inPath = PUBLIC + rel;
    if (!existsSync(inPath)) {
      // Loud, not silent: a missing input means a reference somewhere is stale.
      console.error(`  MISSING INPUT ${rel} — skipped`);
      process.exitCode = 1;
      continue;
    }
    for (const w of job.widths) {
      const base = rel.replace(/\.(png|jpe?g)$/i, '');
      const outPath = `${PUBLIC}${job.suffixWidth ? `${base}-${w}` : base}.webp`;
      await convert(inPath, outPath, w, job.opts);
    }
  }
}

console.log(`\n${'='.repeat(52)}`);
console.log(`inputs ${kb(before)}  ->  outputs ${kb(after)}   (-${(100 - (after / before) * 100).toFixed(0)}%)`);
if (DRY) console.log('(dry run — nothing written)');
