import { writeFileSync } from 'node:fs';
import { BRANDS } from '../data/brands.ts';
import { normalizeProduct } from '../lib/normalize.ts';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function fetchBrand(brand) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    let res;
    try {
      res = await fetch(`${brand.feedUrl}?limit=250&page=${page}`, { headers: { 'User-Agent': UA } });
    } catch (e) {
      console.warn(`  ${brand.slug} page ${page}: ${e.message}`);
      break;
    }
    if (!res.ok) { console.warn(`  ${brand.slug} page ${page}: HTTP ${res.status}`); break; }
    const data = await res.json().catch(() => ({}));
    const products = data.products || [];
    if (products.length === 0) break;
    for (const sp of products) {
      const p = normalizeProduct(sp, brand);
      if (p) out.push(p);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return out;
}

const all = [];
for (const brand of BRANDS) {
  console.log(`Scraping ${brand.name}...`);
  try {
    const items = await fetchBrand(brand);
    console.log(`  ${items.length} products`);
    all.push(...items);
  } catch (e) {
    console.warn(`  FAILED ${brand.slug}: ${e.message}`);
  }
}
writeFileSync(new URL('../data/raw-products.json', import.meta.url), JSON.stringify(all, null, 2));
console.log(`\nTotal: ${all.length} products -> data/raw-products.json`);
