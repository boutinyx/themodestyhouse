// Folds a live-cuts export (downloaded from /staff/curate, or fetched from
// GET /api/staff/curate/export on the running deployment) into the
// git-tracked data/decisions.json — the deliberate manual step that lets a
// decision made on the live server survive a redeploy and reach the normal
// publish pipeline. See docs/log/2026-08-12-staff-curate.md.
//
// Usage:
//   node scripts/merge-live-cuts.mjs path/to/live-cuts-2026-08-12.json
//   npm run build:data     # only 'cut' entries change what publishes
//
// Writes decisions[id] DIRECTLY (unlike lib/lifecycle.ts::nextDecisions(),
// which only defaults an ABSENT id) — a cut made by a human in the live admin
// must be able to override a prior 'keep', same as any other editorial call.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DECISIONS = new URL('../data/decisions.json', import.meta.url);

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/merge-live-cuts.mjs <path-to-live-cuts-export.json>');
  process.exit(1);
}
if (!existsSync(inputPath)) {
  console.error(`No file at ${inputPath}`);
  process.exit(1);
}

const liveCuts = JSON.parse(readFileSync(inputPath, 'utf8'));
const decisions = existsSync(DECISIONS) ? JSON.parse(readFileSync(DECISIONS, 'utf8')) : {};

let changed = 0;
let unchanged = 0;
const applied = [];
for (const [id, entry] of Object.entries(liveCuts)) {
  if (decisions[id] === entry.decision) { unchanged++; continue; }
  decisions[id] = entry.decision;
  applied.push({ id, decision: entry.decision });
  changed++;
}

// MINIFIED, no `null, 2` — matches how add-brands.mjs already writes this
// file. CLAUDE.md §8 documents "decisions.json formatting is contested":
// whichever writer runs last reflows the whole 427 KB tracked file into a
// giant diff. Pretty-printing here would BE that flip.
writeFileSync(DECISIONS, JSON.stringify(decisions));

console.log(`Merged ${Object.keys(liveCuts).length} live decision(s) from ${inputPath}:`);
console.log(`  ${changed} written to data/decisions.json, ${unchanged} already matched`);
if (applied.length) {
  console.log('Changed:');
  for (const a of applied) console.log(`  ${a.id} -> ${a.decision}`);
}
console.log('\nNext: npm run build:data — nothing is live until that republishes products.json.');
