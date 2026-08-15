// Catalogue refresh: re-fetch every brand, detect what they added, removed and
// changed, then republish. See docs/superpowers/specs/2026-08-05-catalogue-refresh-design.md
//
// Imports .ts — MUST run under tsx (`npm run refresh`), never bare node.
//
// This script is deliberately thin: it does network I/O, file I/O and reporting.
// Every RULE lives in lib/lifecycle.ts where it is unit-tested. Nothing here
// decides what gets hidden.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { BRANDS } from '../data/brands.ts';
import { fetchBrand } from '../lib/ingest.ts';
import { applyBrandRefresh, nextDecisions } from '../lib/lifecycle.ts';

const U = (f) => new URL(`../data/${f}`, import.meta.url);
const TODAY = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Brands populated by a dedicated script, never by the generic per-brand
// fetch/refresh loop below — an ordinary refresh of their feed would
// reintroduce whatever that script was specifically built to avoid. Right
// now that's touche-prive AND touche-prive-eu together
// (scripts/touche-prive-dual-region.mjs): Tina's policy (2026-08-15) is
// "only publish a Touché Privé item that exists on BOTH regional stores" —
// a generic refresh of either brand alone has no way to know that, and
// would republish every single-store item the dedicated script had
// deliberately filtered out. Excluded from the bare/all-brands run; naming
// either one explicitly (`npm run refresh -- touche-prive`) still works but
// does a plain full-catalog refresh and WILL reintroduce single-store
// items — use the dedicated script instead.
const CUSTOM_MANAGED = new Set(['touche-prive', 'touche-prive-eu']);

const only = new Set(process.argv.slice(2));
const targets = only.size ? BRANDS.filter((b) => only.has(b.slug)) : BRANDS.filter((b) => !CUSTOM_MANAGED.has(b.slug));
if (only.size && targets.length !== only.size) {
  const missing = [...only].filter((s) => !BRANDS.some((b) => b.slug === s));
  throw new Error(`Unknown brand slug(s): ${missing.join(', ')}`);
}

// --- backup BEFORE any write ------------------------------------------------
// data/raw-products.json is gitignored and is the only copy that exists
// anywhere (P0-B). §1 forbids a destructive operation without a verified backup.
const backupDir = new URL('../data/.backups/', import.meta.url);
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = new URL(`raw-products.${stamp}.json`, backupDir);
copyFileSync(U('raw-products.json'), backup);
const backupSize = readFileSync(backup, 'utf8').length;
if (backupSize < 1000) throw new Error(`Backup looks empty (${backupSize} bytes) — aborting.`);
console.log(`Backup: data/.backups/raw-products.${stamp}.json (${(backupSize / 1e6).toFixed(1)} MB)`);

// --- legacy backfill --------------------------------------------------------
// Rows ingested before lifecycle tracking existed have no firstSeen. Stamping
// today would claim 13k products arrived this morning; null records the truth,
// which is that we don't know. Idempotent: rows written by this script always
// carry the key, so they are never re-nulled.
let raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));
const legacy = raw.filter((p) => !('firstSeen' in p));
if (legacy.length) {
  for (const p of legacy) p.firstSeen = null;
  console.log(`Backfilled firstSeen=null on ${legacy.length} pre-tracking rows.`);
}

// --- refresh, brand by brand ------------------------------------------------
const reports = [];
for (const brand of targets) {
  console.log(`\n${brand.name} (${brand.slug})...`);
  let result;
  try {
    result = await fetchBrand(brand);
  } catch (e) {
    console.error(`  FETCH FAILED: ${e.message} — skipping (nothing delisted)`);
    reports.push({ brandSlug: brand.slug, error: e.message, complete: false });
    continue;
  }

  if (!result.complete) {
    const why = Object.entries(result.outcome).filter(([, v]) => v === true).map(([k]) => k).join(', ');
    console.warn(`  INCOMPLETE fetch (${why}) — will add/update only, nothing will be delisted`);
  }

  const { rows, report } = applyBrandRefresh(raw, result, TODAY);
  raw = rows;

  const decisions = JSON.parse(readFileSync(U('decisions.json'), 'utf8'));
  writeFileSync(U('decisions.json'), JSON.stringify(nextDecisions(decisions, result.normalized.map((p) => p.id))));
  // Checkpoint per brand (§10.7): a killed run keeps completed work.
  writeFileSync(U('raw-products.json'), JSON.stringify(raw, null, 2));

  reports.push(report);
  console.log(
    `  fetched ${report.fetched} | +${report.added.length} new | ${report.updated} updated | ` +
    `-${report.delisted} delisted | ${report.filtered.length} filtered | ${report.returned} returned`,
  );
  await sleep(6000); // space out brands
}

// --- report -----------------------------------------------------------------
const totals = reports.reduce((a, r) => ({
  added: a.added + (r.added?.length || 0),
  updated: a.updated + (r.updated || 0),
  delisted: a.delisted + (r.delisted || 0),
  filtered: a.filtered + (r.filtered?.length || 0),
  returned: a.returned + (r.returned || 0),
  incomplete: a.incomplete + (r.complete ? 0 : 1),
}), { added: 0, updated: 0, delisted: 0, filtered: 0, returned: 0, incomplete: 0 });

writeFileSync(U('refresh-report.json'), JSON.stringify({ date: TODAY, totals, brands: reports }, null, 2));

console.log('\n=== REFRESH SUMMARY ===');
console.table(reports.map((r) => ({
  brand: r.brandSlug, complete: r.complete, fetched: r.fetched ?? 0,
  new: r.added?.length ?? 0, updated: r.updated ?? 0,
  delisted: r.delisted ?? 0, filtered: r.filtered?.length ?? 0, returned: r.returned ?? 0,
})));
console.log(totals);

const allFiltered = reports.flatMap((r) => (r.filtered || []).map((f) => `${r.brandSlug}: ${f.title} (${f.reason})`));
if (allFiltered.length) {
  console.log(`\nDropped by OUR filters (${allFiltered.length}) — a large number here means a classifier regression, not churn:`);
  for (const line of allFiltered.slice(0, 40)) console.log(`  ${line}`);
  if (allFiltered.length > 40) console.log(`  …and ${allFiltered.length - 40} more, see data/refresh-report.json`);
}

const allNew = reports.flatMap((r) => (r.added || []).map((t) => `${r.brandSlug}: ${t}`));
if (allNew.length) {
  console.log(`\nNew arrivals now live (${allNew.length}) — cut any you dislike via data/exclusions.json:`);
  for (const line of allNew.slice(0, 60)) console.log(`  ${line}`);
  if (allNew.length > 60) console.log(`  …and ${allNew.length - 60} more, see data/refresh-report.json`);
}

// --- publish ----------------------------------------------------------------
// Ingest and publish are ONE operation (§10.8) — never leave this to memory.
console.log('\nRepublishing…');
execFileSync('npx', ['tsx', 'scripts/build-data.mjs'], {
  stdio: 'inherit',
  cwd: new URL('..', import.meta.url).pathname,
});
