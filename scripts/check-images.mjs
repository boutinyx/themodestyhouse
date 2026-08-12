// Image health check — verifies every published product's image URL
// actually returns real image bytes. Complements lib/qualityFlags.ts:
// that catches brands who SAY something's wrong; this catches brands who
// never said anything, and a genuinely dead/broken URL.
//
// Informational only, like every other audit script in this repo (audit:
// mobile, audit:visual, etc.) — writes a report, does not touch
// exclusions.json itself. A human decides what to do with a real hit via
// /admin/photo-review or a direct exclusions.json edit.
//
// Usage: node scripts/check-images.mjs [--concurrency=20] [--limit=N]
import { readFileSync, writeFileSync } from 'node:fs';

const CONCURRENCY = Number(process.argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? 20);
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity);
const TIMEOUT_MS = 8000;

const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const targets = products.slice(0, LIMIT);

async function checkOne(p) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(p.image, { signal: controller.signal, headers: { Range: 'bytes=0-2048' } });
    clearTimeout(timer);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok && res.status !== 206) {
      return { id: p.id, title: p.title, brand: p.brandName, image: p.image, problem: `HTTP ${res.status}` };
    }
    if (!contentType.startsWith('image/')) {
      return { id: p.id, title: p.title, brand: p.brandName, image: p.image, problem: `content-type: ${contentType || '(none)'}` };
    }
    return null;
  } catch (e) {
    clearTimeout(timer);
    return { id: p.id, title: p.title, brand: p.brandName, image: p.image, problem: `fetch failed: ${e.message}` };
  }
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
      if (idx % 500 === 0) console.log(`  ${idx}/${items.length}...`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
  return results;
}

console.log(`Checking ${targets.length} product images (concurrency ${CONCURRENCY})...`);
const results = await runPool(targets, checkOne, CONCURRENCY);
const problems = results.filter(Boolean);

writeFileSync(new URL('../data/image-check-report.json', import.meta.url), JSON.stringify(problems, null, 2));
console.log(`\nDone. ${problems.length} problem(s) found, out of ${targets.length} checked.`);
console.log('Written to data/image-check-report.json.');
if (problems.length) {
  console.log('\nFirst 20:');
  for (const p of problems.slice(0, 20)) console.log(` ${p.brand} | ${p.title} | ${p.problem} | ${p.image}`);
}
