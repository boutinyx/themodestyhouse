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
    // /edits/jersey-hijabs hero, desktop. v2, 2026-08-25: a Magnific upscale at
    // 2048x1152 — exactly 16:9 — replacing the 1672px original. NEW filename
    // rather than an overwrite (public/ is cached 4h and unfingerprinted).
    file: 'edit-jersey-hero-v2.jpg',
    widths: [640, 1024, 1440, 1920, 2048],
    suffixWidth: true,
    opts: { quality: 95, effort: 6 },
  },
  {
    // Same hero, phone. 864x1152, exactly 3:4.
    // NOTE THE TRADE: this is SMALLER than the 1792px portrait it replaces, so
    // a 390px phone at 3x DPR (needs 1170) is now a ~1.35x stretch where it
    // used to be native. Tina picked this frame deliberately; recording the
    // cost rather than silently shipping a softer phone hero.
    file: 'edit-jersey-hero-mobile-v2.jpg',
    widths: [390, 640, 864],
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
