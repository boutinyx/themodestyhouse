// Stamp each Style-It piece's natural pixel dimensions into lib/stylePieces.ts.
//
//   node scripts/stamp-piece-dims.mjs
//
// WHY: the picker needs to size garments so they cover roughly equal AREA — a
// trouser is tall and narrow, a top is wide and short, and `object-fit: contain`
// alone makes the top far the bigger object on screen. Working out how much of
// the frame a garment fills needs its aspect ratio, and that is a property of
// the image file, not something the component can know.
//
// Run it after adding or re-cutting a piece. It is idempotent: an entry whose
// stamped numbers already match its file is left alone.
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FILE = `${ROOT}lib/stylePieces.ts`;
let src = readFileSync(FILE, 'utf8');

const srcs = [...src.matchAll(/"src": "(\/style-it\/[a-z0-9_-]+\.webp)"/gi)].map((m) => m[1]);
let stamped = 0, unchanged = 0, missing = 0;

for (const rel of srcs) {
  const file = `${ROOT}public${rel}`;
  if (!existsSync(file)) {
    console.error(`  MISSING ${rel} — referenced by stylePieces but not on disk`);
    missing++;
    continue;
  }
  const { width, height } = await sharp(file).metadata();
  // Ink fraction: the share of the canvas that is actually cloth. The picker
  // sizes garments by area of CLOTH, not by bounding box — a garment whose shape
  // spends its height on a pointed hem covers less ink at the same height and
  // reads as smaller. See the maxH note in lib/stylePieces.ts.
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 0; i < info.width * info.height; i++) if (data[i * info.channels + 3] > 128) opaque++;
  const ink = +(opaque / (info.width * info.height)).toFixed(4);

  // The entry is the object literal that owns this src.
  const key = `"src": "${rel}"`;
  const i = src.indexOf(key);
  const end = src.indexOf('\n    }', i);
  const entry = src.slice(i, end);

  const already = entry.match(/"w":\s*(\d+),\s*\n\s*"h":\s*(\d+),\s*\n\s*"ink":\s*([\d.]+)/);
  if (already && Number(already[1]) === width && Number(already[2]) === height && Number(already[3]) === ink) {
    unchanged++;
    continue;
  }

  const block = `"w": ${width},\n      "h": ${height},\n      "ink": ${ink}`;
  let next = entry;
  if (already) {
    next = entry.replace(/"w":\s*\d+,\s*\n\s*"h":\s*\d+,\s*\n\s*"ink":\s*[\d.]+/, block);
  } else if (/"w":\s*\d+/.test(entry)) {
    next = entry.replace(/"w":\s*\d+,\s*\n\s*"h":\s*\d+/, block);
  } else {
    next = entry.replace(key, `${key},\n      ${block}`);
    next = next.replace(`${key},\n      "w"`, `${key.slice(0, -1)}",\n      "w"`);
  }
  src = src.slice(0, i) + next + src.slice(end);
  stamped++;
}

writeFileSync(FILE, src);
console.log(`stamped ${stamped}, already correct ${unchanged}, missing ${missing}`);
if (missing) process.exitCode = 1;
