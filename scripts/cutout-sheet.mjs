// Build a review sheet for the Style-It cutouts: every asset in public/style-it/,
// large, on a background you can switch, so a bad mask is obvious.
//
//   node scripts/cutout-sheet.mjs        # writes style-cutouts.html at the repo root
//   open style-cutouts.html
//
// WHY: the pieces render ~208px wide on a phone now, up from 116, and at that
// size two assets turned out to have torn masks (top_8's right sleeve,
// bottom_8's right leg) that nobody could see before. A cutout defect is
// invisible against the site's own pale card and obvious against a contrasting
// or checkered ground — this sheet exists to make that judgement quick.
//
// Re-run it after re-cutting anything; it reads the folder and lib/stylePieces.ts
// afresh, so a piece that is no longer in the picker is labelled as such rather
// than silently disappearing.
import sharp from 'sharp';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIR = `${ROOT}public/style-it/`;

const pieces = readFileSync(`${ROOT}lib/stylePieces.ts`, 'utf8');
/** Files pulled from the picker for a KNOWN defect, with the reason. Anything
 *  else that is absent is simply unused — top_7 has been an orphan since before
 *  any of this — and must not be labelled as broken. */
const KNOWN_BAD = {
  // top_8 and bottom_8 lived here — right sleeve sliced through, right leg
  // ragged — until Tina re-cut the whole set on 2026-08-08. The replacements
  // are the `-v2` files and the originals are retired. Kept as a comment so the
  // next defect gets recorded the same way rather than re-discovered.
};
/** In the picker = referenced by lib/stylePieces.ts. */
const inPicker = (file) => pieces.includes(`/style-it/${file}`);
/** The label the site shows, so a defect can be reported by name not filename. */
function labelFor(file) {
  const i = pieces.indexOf(`"src": "/style-it/${file}"`);
  if (i === -1) return null;
  const chunk = pieces.slice(i, i + 400);
  const brand = chunk.match(/"brand":\s*"([^"]+)"/)?.[1];
  const label = chunk.match(/"label":\s*"([^"]+)"/)?.[1];
  return [brand, label].filter(Boolean).join(' · ') || null;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.webp')).sort();
const groups = { top: [], bottom: [], dress: [] };

for (const file of files) {
  const meta = await sharp(DIR + file).metadata();
  // Share of the canvas that is actually opaque. A very high number on a
  // garment that should have gaps (between sleeves and body, between legs) is
  // a hint that background was left behind.
  const { data, info } = await sharp(DIR + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let solid = 0;
  for (let i = 0; i < info.width * info.height; i++) if (data[i * info.channels + 3] > 200) solid++;
  const kind = file.split('_')[0];
  (groups[kind] ??= []).push({
    file,
    png: file.replace(/\.webp$/, '.png'),
    w: meta.width,
    h: meta.height,
    solid: ((solid / (info.width * info.height)) * 100).toFixed(0),
    used: inPicker(file),
    bad: KNOWN_BAD[file] ?? null,
    label: labelFor(file),
  });
}

const card = (p) => `
      <figure class="tile${p.bad ? ' dropped' : ''}">
        <div class="art"><img src="public/style-it/${p.file}" alt="${p.label ?? p.file}" loading="lazy"></div>
        <figcaption>
          <b>${p.label ?? '<i>not in the picker</i>'}</b>
          <span class="meta">${p.file} · ${p.w}×${p.h} · ${p.solid}% opaque</span>
          ${p.used ? '' : p.bad
            ? `<span class="badge bad">bad mask — ${p.bad}</span>`
            : '<span class="badge">not in the picker (unused)</span>'}
          <span class="links">
            <a href="public/style-it/${p.file}" download>webp (shipped)</a>
            <a href="public/style-it/${p.png}" download>png (original)</a>
          </span>
        </figcaption>
      </figure>`;

const section = (title, list) => !list?.length ? '' : `
    <h2>${title} <span class="count">${list.length}</span></h2>
    <div class="grid">${list.map(card).join('')}</div>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Style-It cutouts — review sheet</title>
<style>
  :root { --bg:#faf7f1; --ink:#241b24; --muted:#8a7d6b; --hairline:#e4ddcf; --aubergine:#441943; }
  * { box-sizing:border-box; }
  body { margin:0; padding:28px 24px 80px; background:var(--bg); color:var(--ink);
         font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif; }
  header { max-width:1100px; margin:0 auto 26px; }
  h1 { font-size:22px; margin:0 0 6px; letter-spacing:.01em; }
  p.lede { margin:0 0 18px; color:var(--muted); font-size:14px; line-height:1.6; max-width:66ch; }
  h2 { max-width:1400px; margin:34px auto 12px; font-size:13px; text-transform:uppercase;
       letter-spacing:.18em; color:var(--muted); font-weight:600; }
  .count { color:var(--hairline); }
  .bar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .bar span.lbl { font-size:12px; color:var(--muted); margin-right:2px; }
  button { font:inherit; font-size:12px; padding:7px 13px; border-radius:999px; cursor:pointer;
           border:1px solid var(--hairline); background:#fff; color:var(--ink); }
  button[aria-pressed="true"] { background:var(--aubergine); color:#fff; border-color:var(--aubergine); }
  .grid { max-width:1400px; margin:0 auto; display:grid; gap:16px;
          grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); }
  .tile { margin:0; background:#fff; border:1px solid var(--hairline); border-radius:12px; overflow:hidden; }
  .tile.dropped { border-color:#d9534f; }
  /* The swatch behind the artwork. A checkerboard is the default because stray
     semi-transparent pixels show against it that vanish on any flat colour. */
  .art { height:300px; display:flex; align-items:center; justify-content:center; padding:10px; }
  body[data-bg="check"] .art {
    background-image:
      linear-gradient(45deg,#d8d8d8 25%,transparent 25%),
      linear-gradient(-45deg,#d8d8d8 25%,transparent 25%),
      linear-gradient(45deg,transparent 75%,#d8d8d8 75%),
      linear-gradient(-45deg,transparent 75%,#d8d8d8 75%);
    background-size:18px 18px;
    background-position:0 0,0 9px,9px -9px,-9px 0;
    background-color:#fff;
  }
  body[data-bg="magenta"]  .art { background:#f0f; }
  body[data-bg="parchment"].art, body[data-bg="parchment"] .art { background:var(--bg); }
  body[data-bg="dark"] .art { background:#241b24; }
  body[data-bg="white"] .art { background:#fff; }
  .art img { max-width:100%; max-height:100%; object-fit:contain; }
  figcaption { padding:11px 12px 13px; border-top:1px solid var(--hairline); display:grid; gap:3px; }
  figcaption b { font-size:13px; font-weight:600; }
  .meta { font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; }
  .badge { justify-self:start; font-size:10px; text-transform:uppercase; letter-spacing:.1em;
           background:#f1ece4; color:var(--muted); padding:3px 8px; border-radius:999px;
           margin-top:3px; text-align:left; text-transform:none; letter-spacing:0; line-height:1.4; }
  .badge.bad { background:#fdecea; color:#a3302c; }
  .links { margin-top:5px; display:flex; gap:10px; }
  .links a { font-size:11px; color:var(--aubergine); }
</style>
</head>
<body data-bg="check">
<header>
  <h1>Style-It cutouts</h1>
  <p class="lede">
    Every asset in <code>public/style-it/</code>. Switch the background — a torn or
    unfinished mask is invisible on white and obvious on the checkerboard or magenta.
    Download the <b>png</b> to edit; drop the fixed file back into
    <code>public/style-it/</code> keeping the same name, then run
    <code>node scripts/optimise-images.mjs</code> to regenerate the webp the site
    actually serves, and <code>node scripts/cutout-sheet.mjs</code> to rebuild this page.
  </p>
  <div class="bar">
    <span class="lbl">Background</span>
    <button data-set="check" aria-pressed="true">Checkerboard</button>
    <button data-set="magenta" aria-pressed="false">Magenta</button>
    <button data-set="white" aria-pressed="false">White</button>
    <button data-set="parchment" aria-pressed="false">Site parchment</button>
    <button data-set="dark" aria-pressed="false">Dark</button>
  </div>
</header>
${section('Tops', groups.top)}
${section('Bottoms', groups.bottom)}
${section('Dresses', groups.dress)}
<script>
  document.querySelectorAll('button[data-set]').forEach((b) => {
    b.addEventListener('click', () => {
      document.body.dataset.bg = b.dataset.set;
      document.querySelectorAll('button[data-set]').forEach((o) =>
        o.setAttribute('aria-pressed', String(o === b)));
    });
  });
</script>
</body>
</html>
`;

writeFileSync(`${ROOT}style-cutouts.html`, html);
const total = Object.values(groups).flat();
console.log(
  `style-cutouts.html — ${total.length} pieces · ${total.filter((p) => p.used).length} in the picker · ` +
  `${total.filter((p) => p.bad).length} bad mask · ${total.filter((p) => !p.used && !p.bad).length} unused`
);
for (const [k, v] of Object.entries(groups)) console.log(`  ${k.padEnd(7)} ${v.length}`);
