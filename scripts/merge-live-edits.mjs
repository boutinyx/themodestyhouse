// Manual sync step for the inline staff-editing feature
// (docs/log/2026-08-12-inline-staff-editing.md). Takes the JSON copied from
// /staff/curate's "Copy for Claude" button (save it to a file first), and
// folds it into the two git-tracked files the pipeline actually reads:
// deletes -> data/decisions.json (same target/behaviour as the existing
// scripts/merge-live-cuts.mjs, not changed here), moves ->
// data/garment-overrides.json (already read by
// lib/garmentReview.ts::resolveGarment at publish time).
//
// Usage:
//   node scripts/merge-live-edits.mjs path/to/pasted-export.json
//   npm run build:data
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DECISIONS = new URL('../data/decisions.json', import.meta.url);
const GARMENT_OVERRIDES = new URL('../data/garment-overrides.json', import.meta.url);

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/merge-live-edits.mjs <path-to-pasted-export.json>');
  process.exit(1);
}
if (!existsSync(inputPath)) {
  console.error(`No file at ${inputPath}`);
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, 'utf8'));
const decisions = existsSync(DECISIONS) ? JSON.parse(readFileSync(DECISIONS, 'utf8')) : {};
const garmentOverrides = existsSync(GARMENT_OVERRIDES)
  ? JSON.parse(readFileSync(GARMENT_OVERRIDES, 'utf8'))
  : {};

let cutChanged = 0;
let cutUnchanged = 0;
const cutApplied = [];
for (const d of input.deletes ?? []) {
  if (decisions[d.id] === 'cut') { cutUnchanged++; continue; }
  decisions[d.id] = 'cut';
  cutApplied.push(d.id);
  cutChanged++;
}

let moveChanged = 0;
let moveUnchanged = 0;
const moveApplied = [];
for (const m of input.moves ?? []) {
  if (garmentOverrides[m.id] === m.to) { moveUnchanged++; continue; }
  garmentOverrides[m.id] = m.to;
  moveApplied.push({ id: m.id, to: m.to });
  moveChanged++;
}

// decisions.json: MINIFIED, no `null, 2` — matches scripts/merge-live-cuts.mjs
// and scripts/add-brands.mjs. CLAUDE.md §8 documents "decisions.json
// formatting is contested": whichever writer runs last reflows the whole
// tracked file into a giant diff. Pretty-printing here would BE that flip.
writeFileSync(DECISIONS, JSON.stringify(decisions));
// garment-overrides.json is already pretty-printed on disk (2-space indent,
// written by the /admin/review dev tool) — matching that, not introducing a
// third convention.
writeFileSync(GARMENT_OVERRIDES, JSON.stringify(garmentOverrides, null, 2));

console.log(`Deletes: ${cutChanged} written to data/decisions.json, ${cutUnchanged} already matched`);
if (cutApplied.length) {
  console.log('  Changed:');
  for (const id of cutApplied) console.log(`    ${id} -> cut`);
}
console.log(`Moves: ${moveChanged} written to data/garment-overrides.json, ${moveUnchanged} already matched`);
if (moveApplied.length) {
  console.log('  Changed:');
  for (const m of moveApplied) console.log(`    ${m.id} -> ${m.to}`);
}
console.log('\nNext: npm run build:data — nothing is live until that republishes products.json.');
