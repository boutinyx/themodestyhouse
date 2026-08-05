// One-off ingestion for newly-added brands. Scrapes ONLY the given slugs, merges
// them into data/raw-products.json (replacing any prior rows for those slugs), and
// auto-adds their 'keep' decisions — then run `npm run build:data`.
import { readFileSync, writeFileSync } from 'node:fs';
import { BRANDS } from '../data/brands.ts';
import { normalizeProduct } from '../lib/normalize.ts';

const DEFAULT_SLUGS = ['jaida', 'culture-hijab', 'nasiba', 'jawda', 'feradje', 'inayah'];
const argSlugs = process.argv.slice(2);
const NEW_SLUGS = new Set(argSlugs.length ? argSlugs : DEFAULT_SLUGS);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Persistent: keep retrying a rate-limited page (up to ~14 attempts, capped
// backoff) so pagination actually completes instead of truncating a big brand.
async function fetchPage(url) {
  for (let attempt = 0; attempt < 14; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA } });
    } catch (e) {
      console.warn(`   fetch error: ${e.message}; retrying`);
      await sleep(5000);
      continue;
    }
    if (res.status === 429) {
      const wait = Math.min(8000 + attempt * 4000, 45000);
      console.warn(`   429 rate-limited; backing off ${wait / 1000}s (attempt ${attempt + 1})`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) return { status: res.status, products: null, gaveUp: false };
    const data = await res.json().catch(() => ({}));
    return { status: 200, products: data.products || [], gaveUp: false };
  }
  return { status: 429, products: null, gaveUp: true };
}

async function fetchBrand(brand) {
  const out = [];
  let complete = true; // did we paginate to the natural end?
  for (let page = 1; page <= 20; page++) {
    const { status, products, gaveUp } = await fetchPage(`${brand.feedUrl}?limit=250&page=${page}`);
    if (products === null) { console.warn(`  ${brand.slug} page ${page}: HTTP ${status}`); complete = false; break; }
    if (products.length === 0) break; // natural end
    for (const sp of products) {
      const p = normalizeProduct(sp, brand);
      if (p) out.push(p);
    }
    if (gaveUp) { complete = false; break; }
    await sleep(2000);
  }
  return { items: out, complete };
}

const targets = BRANDS.filter((b) => NEW_SLUGS.has(b.slug));
const rawUrl = new URL('../data/raw-products.json', import.meta.url);
const decUrl = new URL('../data/decisions.json', import.meta.url);

// UPSERT by product id: update matched products (e.g. swap in a model image),
// add new ones, and NEVER delete existing products. A rate-limited/partial scrape
// can therefore only improve the catalogue, never shrink it. Writes after each
// brand so progress persists and the run is resumable.
for (const brand of targets) {
  console.log(`Scraping ${brand.name} (${brand.slug})...`);
  const { items, complete } = await fetchBrand(brand);
  console.log(`  ${items.length} products fetched${complete ? '' : ' (partial — rate-limited)'}`);
  if (items.length === 0) { await sleep(6000); continue; }

  const raw = JSON.parse(readFileSync(rawUrl, 'utf8'));
  const byId = new Map(raw.map((p) => [p.id, p]));
  let updated = 0, addedNew = 0;
  for (const p of items) {
    if (byId.has(p.id)) updated++; else addedNew++;
    byId.set(p.id, p);
  }
  writeFileSync(rawUrl, JSON.stringify([...byId.values()], null, 2));

  const decisions = JSON.parse(readFileSync(decUrl, 'utf8'));
  for (const p of items) decisions[p.id] = 'keep';
  writeFileSync(decUrl, JSON.stringify(decisions));
  console.log(`  upserted ${brand.slug}: ${updated} updated, ${addedNew} new`);
  await sleep(6000); // space out brands to ease rate-limiting
}
console.log('\nDone.');
