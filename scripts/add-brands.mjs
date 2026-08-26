// One-off ingestion for NEWLY-ADDED brands. Scrapes only the given slugs and
// merges them into data/raw-products.json — then run `npm run build:data`.
//
// For ongoing catalogue maintenance use `npm run refresh` instead: this script
// only ever adds and updates, so it cannot notice a product a brand deleted.
//
// Imports .ts — MUST run under tsx, never bare node.
import { readFileSync, writeFileSync } from 'node:fs';
import { BRANDS } from '../data/brands.ts';
import { fetchBrand } from '../lib/ingest.ts';
import { applyBrandRefresh, nextDecisions } from '../lib/lifecycle.ts';

const argSlugs = process.argv.slice(2);
if (!argSlugs.length) {
  throw new Error('Usage: npx tsx scripts/add-brands.mjs <slug> [<slug>…] — refusing to run with no slugs.');
}
const targets = BRANDS.filter((b) => argSlugs.includes(b.slug));
const missing = argSlugs.filter((s) => !BRANDS.some((b) => b.slug === s));
if (missing.length) throw new Error(`Unknown brand slug(s): ${missing.join(', ')}`);

const TODAY = new Date().toISOString().slice(0, 10);
const U = (f) => new URL(`../data/${f}`, import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const brand of targets) {
  console.log(`Scraping ${brand.name} (${brand.slug})...`);
  let result;
  try {
    result = await fetchBrand(brand);
  } catch (e) {
    // A brand whose currency could not be determined throws (lib/ingest.ts).
    // Report it and carry on: one unreadable storefront must not abandon the
    // other slugs on the command line, and skipping writes nothing, so its
    // existing rows are untouched.
    console.error(`  SKIPPED: ${e.message}`);
    await sleep(6000);
    continue;
  }
  console.log(`  ${result.normalized.length} products fetched in ${result.feedCurrency}${result.complete ? '' : ' (partial — rate-limited)'}`);
  if (result.feedCurrency && result.feedCurrency !== brand.currency) {
    console.warn(`  NOTE: feed served ${result.feedCurrency}, data/brands.ts declares ${brand.currency}. Using ${result.feedCurrency}.`);
  }
  if (result.normalized.length === 0) { await sleep(6000); continue; }

  const raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));
  // complete:false — this script adds and updates but must never delist. That is
  // what a new-brand ingest is for; delisting is `npm run refresh`'s job.
  const { rows, report } = applyBrandRefresh(raw, { ...result, complete: false }, TODAY);
  writeFileSync(U('raw-products.json'), JSON.stringify(rows, null, 2));

  // Only default an id that has no decision yet. Writing 'keep' unconditionally
  // (as this script used to) resurrected every product Tina had cut — Invariant 3.
  const decisions = JSON.parse(readFileSync(U('decisions.json'), 'utf8'));
  writeFileSync(U('decisions.json'), JSON.stringify(nextDecisions(decisions, result.normalized.map((p) => p.id))));

  console.log(`  upserted ${brand.slug}: ${report.updated} updated, ${report.added.length} new`);
  await sleep(6000); // space out brands to ease rate-limiting
}
console.log('\nDone. Now run: npm run build:data');
