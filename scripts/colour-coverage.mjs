// Colour-filter coverage, and the evidence for growing the vocabulary.
//
//   npx tsx scripts/colour-coverage.mjs            # coverage + top 60 unmapped suffixes
//   npx tsx scripts/colour-coverage.mjs 200        # a longer tail
//
// MUST run under tsx, not bare node — it imports .ts (Invariant 7).
//
// This is a REPORTING tool only. It holds no matching logic of its own and
// must never grow any: §8 records a real bug caused by the exclusion filter
// being duplicated between `scripts/build-data.mjs` and `lib/exclude.test.ts`,
// where changing one silently stopped the other from testing anything.
// `lib/colour.ts` owns the vocabulary; this file only counts what it does.
//
// Re-run this after any `npm run refresh`. Coverage is a property of the
// catalogue, not of the code, and the catalogue moves nightly (§10.35).
import { readFileSync } from 'node:fs';
import { colourFamily, COLOUR_FAMILY_LABELS } from '../lib/colour.ts';
import { splitColourSuffix } from '../lib/colorVariants.ts';

const N = Number(process.argv[2] || 60);
const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));

const byFamily = {};
const unmapped = new Map();
let hit = 0;

for (const p of products) {
  const f = colourFamily(p.title);
  if (f) { hit++; byFamily[f] = (byFamily[f] || 0) + 1; continue; }
  const s = splitColourSuffix(p.title);
  if (s) unmapped.set(s.colour.toLowerCase(), (unmapped.get(s.colour.toLowerCase()) || 0) + 1);
}

const pct = (n) => ((100 * n) / products.length).toFixed(1) + '%';
console.log(`published rows : ${products.length}`);
console.log(`with a family  : ${hit}  ${pct(hit)}`);
console.log(`no family      : ${products.length - hit}  ${pct(products.length - hit)}\n`);

for (const [f, label] of Object.entries(COLOUR_FAMILY_LABELS)) {
  console.log(`  ${label.padEnd(18)} ${String(byFamily[f] || 0).padStart(5)}`);
}

console.log(`\nTop ${N} UNMAPPED colour suffixes — each is a real string a brand used`);
console.log('as a colourway name and that no rule matched. Add only the ones that');
console.log('are genuinely colours, with a test each.\n');
[...unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, N)
  .forEach(([s, n]) => console.log(`  ${String(n).padStart(4)}  ${s}`));
