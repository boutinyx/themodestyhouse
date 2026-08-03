import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/raw-products.json', import.meta.url), 'utf8'));
const decPath = new URL('../data/decisions.json', import.meta.url);
const decisions = existsSync(decPath) ? JSON.parse(readFileSync(decPath, 'utf8')) : {};

const kept = raw.filter((p) => decisions[p.id] === 'keep' && p.inStock);

// Interleave brands (round-robin) so the grid mixes brands instead of showing
// one full brand at a time.
function interleaveByBrand(items) {
  const queues = new Map();
  for (const p of items) {
    if (!queues.has(p.brandSlug)) queues.set(p.brandSlug, []);
    queues.get(p.brandSlug).push(p);
  }
  const lists = [...queues.values()];
  const out = [];
  let any = true;
  while (any) {
    any = false;
    for (const q of lists) {
      const item = q.shift();
      if (item) {
        out.push(item);
        any = true;
      }
    }
  }
  return out;
}

const published = interleaveByBrand(kept);
writeFileSync(new URL('../data/products.json', import.meta.url), JSON.stringify(published, null, 2));
console.log(`Published ${published.length} products (mixed across ${new Set(published.map((p) => p.brandSlug)).size} brands) -> data/products.json`);
