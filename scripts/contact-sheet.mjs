// Builds one contact sheet per route from the .audit/visual screenshots:
// mobile | tablet | desktop, full-page, side by side, at a common height — so a
// route can be LOOKED at across the whole matrix in a single image instead of
// nine. Reading a report tells you what measured wrong; only the picture tells
// you what looks wrong (CLAUDE.md §10.22).
//
//   node scripts/contact-sheet.mjs                 # chromium, the default trio
//   ENGINE=webkit node scripts/contact-sheet.mjs
import { readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../.audit/visual/', import.meta.url));
const OUT = fileURLToPath(new URL('../.audit/sheets/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const engine = process.env.ENGINE || 'chromium';
const trio = (process.env.TRIO || 'mobile-390,tablet-819,desktop-1440').split(',');
const H = Number(process.env.H || 1800);

const files = readdirSync(SRC).filter((f) => f.endsWith('-full.png'));
const routes = [...new Set(files.map((f) => f.split('__')[0]))].sort();

let made = 0;
for (const route of routes) {
  const parts = trio
    .map((vp) => `${route}__${vp}__${engine}-full.png`)
    .filter((f) => files.includes(f))
    .map((f) => SRC + f);
  if (!parts.length) continue;
  const out = `${OUT}${route}__${engine}.png`;
  // +append lays the shots in one row, each scaled to a common height so the
  // three widths are directly comparable.
  // NOT `montage -label`: montage always initialises a font, and on a machine
  // with no ImageMagick font configured it dies with "unable to read font ''"
  // even when nothing is being labelled. +append needs no font at all, and the
  // column order is fixed and printed below, so nothing is lost.
  execFileSync('magick', [
    ...parts,
    '-background', '#ffffff',
    '-resize', `x${H}`,
    '-gravity', 'north',
    '+append',
    out,
  ]);
  made++;
  console.log(`${route}  ${parts.length} shots`);
}
console.log(`\n${made} sheets in .audit/sheets/`);
