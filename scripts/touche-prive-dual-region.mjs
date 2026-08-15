// Touché Privé dual-region enrichment — the ONLY thing that should ever touch
// the `touche-prive-eu` brand's raw rows. See data/brands.ts's comment on that
// entry, scripts/refresh.mjs's CUSTOM_MANAGED exclusion, and
// docs/log/2026-08-15-touche-prive-dual-region-links.md for the full story:
// int.toucheprive.com and eu.toucheprive.com are two materially different
// Shopify stores (own ids, own currency, ~75% non-overlapping catalog), and
// eu.toucheprive.com's own geo-redirect app silently sends EU visitors from
// int links to eu ones that often 404 there, while eu.toucheprive.com's
// checkout has no United States market at all.
//
// What this does, every run:
//   1. Fetches BOTH feeds directly (bypassing data/brands.ts's single-feed
//      assumption) to get each item's SKU — normalizeProduct's output has no
//      sku field, so raw-products.json alone can't be used for matching.
//   2. Matches items across stores by SKU style-code prefix (e.g.
//      "26S1R359-101" -> "26S1R359"), which is stable across colourways/sizes
//      and, empirically, across the two regional listings of the same design.
//   3. For a MATCH: patches `altUrl` onto the existing touche-prive (int) raw
//      row with the eu equivalent's URL. lib/regionalLink.ts picks between
//      `url` and `altUrl` client-side, by the visitor's timezone, with no
//      cookie and no IP lookup.
//   4. For an EU-EXCLUSIVE item (no int match): upserts it as its own
//      touche-prive-eu:<id> row via the same applyBrandRefresh/nextDecisions
//      machinery every other brand uses — never added as a *second* card for
//      an item touche-prive (int) already carries.
//
// Prerequisite: run `npm run refresh -- touche-prive` FIRST (int side is a
// perfectly ordinary single-brand refresh, no special-casing needed).
//
// Usage:
//   node scripts/touche-prive-dual-region.mjs
//   ALLOW_LARGE_DIFF=1 npm run build:data   # first run only, until touche-prive-eu exists
import { readFileSync, writeFileSync } from 'node:fs';
import { BRANDS } from '../data/brands.ts';
import { paginateFeed, httpPageFetcher, classifyFeed } from '../lib/ingest.ts';
import { isCompleteFetch, applyBrandRefresh, nextDecisions } from '../lib/lifecycle.ts';
import { normalizeProduct } from '../lib/normalize.ts';

const U = (f) => new URL(`../data/${f}`, import.meta.url);
const TODAY = new Date().toISOString().slice(0, 10);

const intBrand = BRANDS.find((b) => b.slug === 'touche-prive');
const euBrand = BRANDS.find((b) => b.slug === 'touche-prive-eu');
if (!intBrand) throw new Error('touche-prive not found in data/brands.ts');
if (!euBrand) throw new Error('touche-prive-eu not found in data/brands.ts');

function styleCode(sp) {
  const sku = sp.variants?.[0]?.sku;
  return sku ? String(sku).split('-')[0].trim().toUpperCase() : null;
}

console.log('Fetching int.toucheprive.com (raw feed, for SKU matching)...');
const intFeed = await paginateFeed(httpPageFetcher(intBrand));
console.log(`  ${intFeed.products.length} products, complete=${isCompleteFetch(intFeed.outcome)}`);

console.log('Fetching eu.toucheprive.com (raw feed)...');
const euFeed = await paginateFeed(httpPageFetcher(euBrand));
console.log(`  ${euFeed.products.length} products, complete=${isCompleteFetch(euFeed.outcome)}`);
const euComplete = isCompleteFetch(euFeed.outcome);

const intByStyle = new Map();
for (const sp of intFeed.products) {
  const s = styleCode(sp);
  if (s && !intByStyle.has(s)) intByStyle.set(s, sp);
}

const matchedEuIds = new Set();
const altUrlById = new Map(); // touche-prive:<intShopifyId> -> eu product url
let matched = 0;
for (const euSp of euFeed.products) {
  const s = styleCode(euSp);
  const intSp = s ? intByStyle.get(s) : null;
  if (!intSp) continue;
  const euProduct = normalizeProduct(euSp, euBrand);
  if (!euProduct) continue; // eu-side excluded it (men's, non-apparel, etc.) — no alt link to offer
  matchedEuIds.add(euSp.id);
  altUrlById.set(`${intBrand.slug}:${intSp.id}`, euProduct.url);
  matched++;
}
console.log(`Matched ${matched} style codes present on both stores.`);

const euOnly = euFeed.products.filter((sp) => !matchedEuIds.has(sp.id));
console.log(`${euOnly.length} eu-exclusive products (no int match) — upserting as touche-prive-eu.`);

let raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));

let altUrlSet = 0;
let altUrlUnchanged = 0;
raw = raw.map((row) => {
  if (!altUrlById.has(row.id)) return row;
  const altUrl = altUrlById.get(row.id);
  if (row.altUrl === altUrl) { altUrlUnchanged++; return row; }
  altUrlSet++;
  return { ...row, altUrl };
});
console.log(`altUrl: ${altUrlSet} set/changed, ${altUrlUnchanged} already matched.`);

const euOnlyResult = classifyFeed(euOnly, euBrand, euComplete);
const { rows: nextRaw, report } = applyBrandRefresh(raw, euOnlyResult, TODAY);
raw = nextRaw;
console.log(
  `touche-prive-eu: fetched ${report.fetched} | +${report.added.length} new | ${report.updated} updated | ` +
  `-${report.delisted} delisted | ${report.filtered.length} filtered | ${report.returned} returned`,
);

const decisions = JSON.parse(readFileSync(U('decisions.json'), 'utf8'));
writeFileSync(U('decisions.json'), JSON.stringify(nextDecisions(decisions, euOnlyResult.normalized.map((p) => p.id))));
writeFileSync(U('raw-products.json'), JSON.stringify(raw, null, 2));

console.log('\nWrote data/raw-products.json and data/decisions.json.');
console.log('Next: npm run build:data (first run needs ALLOW_LARGE_DIFF=1 — touche-prive-eu is new).');
