// Cut a product photograph out of its studio background.
//
//   node scripts/cutout-product.mjs <input> <output.png> [tolerance]
//   node scripts/cutout-product.mjs shot.jpg public/style-it/bottom_7-v3.png
//
// For flat-lay product shots on an even studio ground — which is what the
// Style-It picker uses. It is NOT a segmentation model: it will not separate a
// garment from a busy or textured background, and it cannot cut around a model.
// For those, cut by hand and drop the PNG in (see scripts/cutout-sheet.mjs).
//
// HOW: flood fill inward from the border, removing anything within `tolerance`
// of the corner colour. Flood fill rather than a global threshold, because a
// global cut also punches holes in light detail INSIDE the garment — a label, a
// highlight, a pale print — whereas the background is by definition connected to
// the edge.
//
// Two traps, both of which produced a confidently wrong image before being found:
//
//   1. sharp's .blur() PROMOTES a 1-channel raw buffer to three channels. Reading
//      the result as mask[p] then takes every third byte and scrambles the mask
//      into something that looks plausibly inverted. Always read info.channels
//      back and stride by it.
//   2. `composite([{ blend: 'dest-in' }])` with a GRAYSCALE mask is a no-op —
//      that blend reads the mask's ALPHA channel, and a grayscale PNG has none,
//      so every pixel counts as opaque and the background survives untouched.
//      Writing the mask into the source's alpha channel directly is unambiguous.
import sharp from 'sharp';

const [IN, OUT, TOL_ARG] = process.argv.slice(2);
if (!IN || !OUT) {
  console.error('usage: node scripts/cutout-product.mjs <input> <output.png> [tolerance]');
  process.exit(1);
}
const TOL = Number(TOL_ARG ?? 26);

const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;
const at = (x, y) => (y * w + x) * ch;

// Reference colour from the four corners — a studio ground is even, so if these
// disagree wildly the photograph is not a candidate for this tool.
const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]].map(([x, y]) => {
  const i = at(x, y);
  return [data[i], data[i + 1], data[i + 2]];
});
const [r0, g0, b0] = corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4, a[2] + c[2] / 4], [0, 0, 0]);
const spread = Math.max(...corners.map((c) => Math.hypot(c[0] - r0, c[1] - g0, c[2] - b0)));
if (spread > 12) {
  console.error(`corners differ by ${spread.toFixed(0)} — the background is not even. Cut this one by hand.`);
  process.exit(1);
}

const bg = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1);
for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y);
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  if (x < 0 || y < 0 || x >= w || y >= h) continue;
  const p = y * w + x;
  if (bg[p]) continue;
  const i = at(x, y);
  if (Math.hypot(data[i] - r0, data[i + 1] - g0, data[i + 2] - b0) >= TOL) continue;
  bg[p] = 1;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

// Erode the keep-region by a pixel: boundary pixels are anti-aliased between
// garment and ground, so keeping them leaves a pale fringe tracing the hem.
const keepCut = new Uint8Array(w * h);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (bg[p]) { keepCut[p] = 1; continue; }
    keepCut[p] = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
      .some(([nx, ny]) => nx < 0 || ny < 0 || nx >= w || ny >= h || bg[ny * w + nx]) ? 1 : 0;
  }
}

const mask = Buffer.alloc(w * h);
for (let p = 0; p < w * h; p++) mask[p] = keepCut[p] ? 0 : 255;
const soft = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
  .blur(0.8).raw().toBuffer({ resolveWithObject: true });
const sc = soft.info.channels;                       // see trap 1 above

const rgba = Buffer.from(data);
for (let p = 0; p < w * h; p++) rgba[p * ch + 3] = soft.data[p * sc];

const masked = await sharp(rgba, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
await sharp(masked).trim().resize({ width: 900, withoutEnlargement: true })
  .png({ compressionLevel: 9 }).toFile(OUT);

// Report what survived, so a bad cut is visible without opening the file.
const out = await sharp(OUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let solid = 0, light = 0;
for (let i = 0; i < out.info.width * out.info.height; i++) {
  const o = i * out.info.channels;
  if (out.data[o + 3] > 200) {
    solid++;
    if (out.data[o] > 215 && out.data[o + 1] > 215 && out.data[o + 2] > 215) light++;
  }
}
const m = await sharp(OUT).metadata();
console.log(`${OUT} — ${m.width}x${m.height}`);
console.log(`  removed ${(bg.reduce((a, v) => a + v, 0) / (w * h) * 100).toFixed(1)}% of the canvas`);
console.log(`  ${(light / solid * 100).toFixed(2)}% of the remaining garment is near-white` +
  (light / solid > 0.04 ? '  <- check for leftover background' : ''));
