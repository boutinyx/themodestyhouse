// Build numbered contact sheets of the colourway names still unanswered, so
// they can simply be LOOKED AT.
//
//   npx tsx scripts/colour-sheets.mjs            # all open terms, 30 per sheet
//   npx tsx scripts/colour-sheets.mjs --per 24
//
// MUST run under tsx — it imports .ts (Invariant 7).
//
// WHY THIS EXISTS, AFTER THREE CLEVERER ATTEMPTS FAILED
// Tina, 2026-08-29: "i just dont get how you cant look at the pictures."
// She is right. The pixel sampler (45%), the zero-shot readers (74%) and the
// dataset-trained probe (48.5%) were all machinery built to avoid doing the
// obvious thing. A person looking at a photograph of a garment and naming its
// colour is close to perfect, and there are only ~750 names left — about
// twenty-five sheets. The cheap thing was never the automation.
//
// One image per TERM, not per product: an answer applies to every piece any
// house names that way, which is what makes the job finite.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { classifyColour } from '../lib/colour.ts';

const APP = new URL('..', import.meta.url);
const root = (p) => new URL(p, APP);
const OUT = new URL('.colour-sheets/', APP);

const argv = process.argv.slice(2);
const num = (f, d) => { const i = argv.indexOf(f); return i === -1 ? d : Number(argv[i + 1]); };
const PER = num('--per', 30);
const COLS = 6;
const W = 200, H = 250, PAD = 26;   // PAD holds the number + the term under each tile

const products = JSON.parse(readFileSync(root('data/products.json'), 'utf8'));

// Every term with no answer from Tina. autoTerms are INCLUDED — they are the
// machine's guesses and looking at the picture is exactly what replaces them.
const overrides = JSON.parse(readFileSync(root('data/colour-overrides.json'), 'utf8'));
const groups = new Map();
for (const p of products) {
  const v = classifyColour(p.title);
  if (!v.term) continue;
  if (v.term in overrides.terms) continue;              // she has spoken
  if (v.confidence === 'suffix' && v.candidates.length <= 1) continue;  // vocabulary is confident
  if (v.confidence === 'weak' || v.confidence === 'none') {
    // keep: these are the open ones
  } else if (v.confidence !== 'auto') continue;
  if (!groups.has(v.term)) groups.set(v.term, { term: v.term, rows: 0, image: p.image, title: p.title });
  groups.get(v.term).rows++;
}
const items = [...groups.values()].sort((a, b) => b.rows - a.rows);

const thumb = (u) => (u.includes('?') ? `${u}&width=260` : `${u}?width=260`);
const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

async function tile(item, n) {
  let img;
  try {
    const res = await fetch(thumb(item.image));
    img = await sharp(Buffer.from(await res.arrayBuffer())).resize(W, H, { fit: 'cover' }).toBuffer();
  } catch {
    img = await sharp({ create: { width: W, height: H, channels: 3, background: '#eee' } }).png().toBuffer();
  }
  // The number and the name go BELOW the picture, never over it — a caption on
  // top of the garment would sit on the very pixels being judged.
  const label = Buffer.from(
    `<svg width="${W}" height="${H + PAD}">
       <rect x="0" y="${H}" width="${W}" height="${PAD}" fill="#ffffff"/>
       <text x="4" y="${H + 18}" font-family="Helvetica,Arial" font-size="15" font-weight="bold" fill="#111">${n}.</text>
       <text x="26" y="${H + 18}" font-family="Helvetica,Arial" font-size="14" fill="#222">${esc(item.term.slice(0, 22))}</text>
     </svg>`);
  return sharp({ create: { width: W, height: H + PAD, channels: 3, background: '#fff' } })
    .composite([{ input: img, top: 0, left: 0 }, { input: label, top: 0, left: 0 }])
    .png().toBuffer();
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const sheets = Math.ceil(items.length / PER);
const index = [];
for (let s = 0; s < sheets; s++) {
  const slice = items.slice(s * PER, (s + 1) * PER);
  const tiles = [];
  for (let i = 0; i < slice.length; i += 8) {
    tiles.push(...(await Promise.all(slice.slice(i, i + 8).map((it, j) => tile(it, s * PER + i + j + 1)))));
  }
  const rows = Math.ceil(tiles.length / COLS);
  const sheet = sharp({ create: { width: COLS * W, height: rows * (H + PAD), channels: 3, background: '#fff' } });
  await sheet
    .composite(tiles.map((t, i) => ({ input: t, left: (i % COLS) * W, top: Math.floor(i / COLS) * (H + PAD) })))
    .jpeg({ quality: 86 })
    .toFile(new URL(`sheet-${String(s + 1).padStart(2, '0')}.jpg`, OUT).pathname);
  index.push(...slice.map((it, i) => ({ n: s * PER + i + 1, sheet: s + 1, term: it.term, rows: it.rows })));
  process.stderr.write(`\r  sheet ${s + 1}/${sheets}`);
}
process.stderr.write('\r');
writeFileSync(new URL('index.json', OUT).pathname, JSON.stringify(index, null, 1) + '\n');
console.log(`${items.length} open terms across ${sheets} sheets in .colour-sheets/`);
console.log(`covering ${items.reduce((s, i) => s + i.rows, 0)} products`);
