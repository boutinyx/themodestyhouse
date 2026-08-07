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
