// Touché Privé dual-region refresh — the ONLY thing that should ever touch
// EITHER the `touche-prive` or `touche-prive-eu` brand's raw rows. See
// data/brands.ts's comments on those two entries, scripts/refresh.mjs's
// CUSTOM_MANAGED exclusion (both slugs), and
// docs/log/2026-08-15-touche-prive-dual-region-links.md /
// docs/log/2026-08-15-touche-prive-dual-only-policy.md for the full story.
//
// Policy (Tina, 2026-08-15, after the dual-region-links feature shipped):
// publish ONLY items that exist on BOTH int.toucheprive.com and
// eu.toucheprive.com. A single-store item is a dead end for whoever isn't
// in that store's market — int has no EU checkout parity issue, but eu's
// checkout has no United States market at all, so an int-only OR
// eu-only listing always fails for someone. Every run re-verifies this from
// scratch; nothing is grandfathered in.
//
// What this does, every run:
//   1. Fetches BOTH feeds directly (bypassing data/brands.ts's single-feed
//      assumption) to get each item's SKU — normalizeProduct's output has no
//      sku field, so raw-products.json alone can't be used for matching.
//   2. Matches items across stores by SKU style-code prefix (e.g.
//      "26S1R359-101" -> "26S1R359"), which is stable across colourways/sizes
//      and, empirically, across the two regional listings of the same design.
//   3. touche-prive (int) publishes ONLY the matched subset, each carrying
//      `altUrl` = the eu equivalent. An int item that loses its eu match
//      (or never had one) is NOT delisted (it's still live on int — that
//      would be a lie) but IS filtered, via applyBrandRefresh's ordinary
//      "our own filters reject it" path, same status as a non-apparel item.
//   4. touche-prive-eu never publishes anything — every eu item is filtered
//      the same way. The brand stays in data/brands.ts only so a historical
//      touche-prive-eu:* id still resolves; nothing new is ever added under
//      it.
//
// Usage:
//   npx tsx scripts/touche-prive-dual-region.mjs
//   npm run build:data
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { BRANDS } from '../data/brands.ts';
import { paginateFeed, httpPageFetcher } from '../lib/ingest.ts';
import { isCompleteFetch, applyBrandRefresh, nextDecisions } from '../lib/lifecycle.ts';
import { normalizeProduct, normalizeProductDetailed } from '../lib/normalize.ts';

const U = (f) => new URL(`../data/${f}`, import.meta.url);

// Houses whose new products default to 'cut' rather than 'keep' — see
// data/default-cut-brands.json and lib/lifecycle.ts::nextDecisions. Read
// defensively: an absent file means "no house does", which is the correct
// reading of an absent list.
const defaultCutBrands = existsSync(U('default-cut-brands.json'))
  ? JSON.parse(readFileSync(U('default-cut-brands.json'), 'utf8')).brands ?? []
  : [];
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
const intComplete = isCompleteFetch(intFeed.outcome);
console.log(`  ${intFeed.products.length} products, complete=${intComplete}`);

console.log('Fetching eu.toucheprive.com (raw feed)...');
const euFeed = await paginateFeed(httpPageFetcher(euBrand));
const euComplete = isCompleteFetch(euFeed.outcome);
console.log(`  ${euFeed.products.length} products, complete=${euComplete}`);

const intByStyle = new Map();
for (const sp of intFeed.products) {
  const s = styleCode(sp);
  if (s && !intByStyle.has(s)) intByStyle.set(s, sp);
}

// eu id -> matching int product's Shopify id, for items with a real style
// match AND a normalizable eu listing (not itself excluded as men's/
// non-apparel/etc).
const euUrlByIntId = new Map();
for (const euSp of euFeed.products) {
  const s = styleCode(euSp);
  const intSp = s ? intByStyle.get(s) : null;
  if (!intSp) continue;
  const euProduct = normalizeProduct(euSp, euBrand);
  if (!euProduct) continue;
  euUrlByIntId.set(intSp.id, euProduct.url);
}
console.log(`${euUrlByIntId.size} style codes present on both stores.`);

// --- touche-prive (int): publish ONLY the matched subset -------------------
const intNormalized = [];
const intRejected = [];
for (const sp of intFeed.products) {
  const altUrl = euUrlByIntId.get(sp.id);
  if (!altUrl) {
    intRejected.push({ id: `${intBrand.slug}:${sp.id}`, reason: 'no-eu-match' });
    continue;
  }
  const { product, reason } = normalizeProductDetailed(sp, intBrand);
  if (!product) {
    intRejected.push({ id: `${intBrand.slug}:${sp.id}`, reason: reason ?? 'no-eu-match' });
    continue;
  }
  intNormalized.push({ ...product, altUrl });
}
console.log(`touche-prive: ${intNormalized.length} matched+normalized, ${intRejected.length} filtered (mostly no-eu-match).`);

// --- touche-prive-eu: publish NOTHING, permanently --------------------------
const euRejectedAll = euFeed.products.map((sp) => ({ id: `${euBrand.slug}:${sp.id}`, reason: 'dual-only-policy' }));

let raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));

const intResult = { brandSlug: intBrand.slug, normalized: intNormalized, rejected: intRejected, complete: intComplete };
let step = applyBrandRefresh(raw, intResult, TODAY);
raw = step.rows;
console.log(
  `touche-prive: fetched ${step.report.fetched} | +${step.report.added.length} new | ${step.report.updated} updated | ` +
  `-${step.report.delisted} delisted | ${step.report.filtered.length} filtered | ${step.report.returned} returned`,
);

const euResult = { brandSlug: euBrand.slug, normalized: [], rejected: euRejectedAll, complete: euComplete };
step = applyBrandRefresh(raw, euResult, TODAY);
raw = step.rows;
console.log(
  `touche-prive-eu: fetched ${step.report.fetched} | +${step.report.added.length} new | ${step.report.updated} updated | ` +
  `-${step.report.delisted} delisted | ${step.report.filtered.length} filtered | ${step.report.returned} returned`,
);

const decisions = JSON.parse(readFileSync(U('decisions.json'), 'utf8'));
writeFileSync(U('decisions.json'), JSON.stringify(nextDecisions(decisions, intNormalized.map((p) => p.id), defaultCutBrands)));
writeFileSync(U('raw-products.json'), JSON.stringify(raw, null, 2));

console.log('\nWrote data/raw-products.json and data/decisions.json.');
console.log('Next: npm run build:data.');
