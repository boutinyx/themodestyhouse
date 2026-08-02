import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/raw-products.json', import.meta.url), 'utf8'));
const decPath = new URL('../data/decisions.json', import.meta.url);
const decisions = existsSync(decPath) ? JSON.parse(readFileSync(decPath, 'utf8')) : {};

const published = raw.filter((p) => decisions[p.id] === 'keep' && p.inStock);
writeFileSync(new URL('../data/products.json', import.meta.url), JSON.stringify(published, null, 2));
console.log(`Published ${published.length} products -> data/products.json`);
