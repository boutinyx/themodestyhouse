// Publish step: raw + decisions + exclusions -> data/products.json
//
// NOTE: this now imports lib/nonApparel.ts, so it MUST run under tsx
// (`npm run build:data`), not bare `node`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isNonApparel } from '../lib/nonApparel.ts';

const U = (f) => new URL(`../data/${f}`, import.meta.url);

const raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));
const decisions = existsSync(U('decisions.json')) ? JSON.parse(readFileSync(U('decisions.json'), 'utf8')) : {};

// Persistent exclusion list (men's items, cut brands, pinned ids). This is a
// women's modest-fashion directory; see data/exclusions.json. Enforced here so a
// rebuild can never reintroduce excluded items.
const excl = JSON.parse(readFileSync(U('exclusions.json'), 'utf8'));
const titleRes = (excl.patterns || []).map((s) => new RegExp(s, 'i'));
const urlRes = (excl.urlPatterns || []).map((s) => new RegExp(s, 'i'));
const excludedIds = new Set(excl.ids || []);
const excludedBrands = new Set(excl.brands || []);
// Escape hatch: a reviewed keep that the non-apparel veto gets wrong.
const allowIds = new Set(excl.nonApparelAllowIds || []);
// Brands that are legitimately accessory-heavy, so Guard 3 shouldn't fail on them.
const expectedHot = new Set(excl.brandNonApparelExpected || []);

const rejected = [];
const review = [];

/** Returns a rejection object, or null to keep. */
function verdict(p) {
  if (excludedBrands.has(p.brandSlug)) return { reason: 'brand-blacklist' };
  if (excludedIds.has(p.id)) return { reason: 'id-pin' };
  if (titleRes.some((re) => re.test(p.title || ''))) return { reason: 'title-pattern' };
  if (urlRes.some((re) => re.test(p.url || ''))) return { reason: 'url-pattern' };
  if (allowIds.has(p.id)) return null;
  const v = isNonApparel({ title: p.title, url: p.url, ...(p.raw || {}) });
  return v.rejected ? { reason: `non-apparel:${v.reason}`, tier: v.tier, evidence: v.evidence } : null;
  // NOTE: there is deliberately NO `garment === 'other'` rejection here. Those
  // rows were inspected and are real clothing the tagger simply could not name
  // (baju kurung, bisht, belted jacket). They go to review, never to deletion.
}

const kept = raw.filter((p) => {
  if (decisions[p.id] !== 'keep' || !p.inStock) return false;
  const v = verdict(p);
  if (v) {
    rejected.push({ id: p.id, brandSlug: p.brandSlug, title: p.title, url: p.url, garmentWas: p.garment, ...v });
    return false;
  }
  if (p.garment === 'other') review.push({ id: p.id, title: p.title, url: p.url, why: 'unclassified' });
  else if (p.raw?.classifiedFrom === 'meta') review.push({ id: p.id, title: p.title, url: p.url, why: 'meta-only' });
  return true;
});

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
      if (item) { out.push(item); any = true; }
    }
  }
  return out;
}

// ---- GUARD 1: SKU-family contamination -> review queue ---------------------
// Merchants encode category in the SKU prefix. If most of a family is vetoed,
// the survivors are suspect too — that is how an UNKNOWN new accessory category
// surfaces without anyone having written a regex for it.
const SKU = /\b([A-Z]{1,4})[-_ ]?\d{3,5}\b/;
const fam = new Map();
for (const p of raw) {
  const m = (p.title || '').match(SKU);
  if (!m) continue;
  const k = `${p.brandSlug}|${m[1]}`;
  if (!fam.has(k)) fam.set(k, { n: 0, bad: 0, survivors: [] });
  const f = fam.get(k);
  f.n++;
  if (isNonApparel({ title: p.title, ...(p.raw || {}) }).rejected) f.bad++;
  else f.survivors.push({ id: p.id, title: p.title, url: p.url });
}
for (const [k, f] of fam) {
  if (f.n >= 4 && f.bad / f.n >= 0.5) {
    for (const s of f.survivors) {
      review.push({ ...s, why: 'contaminated-sku-family', family: k, rate: +(f.bad / f.n).toFixed(2) });
    }
  }
}

// ---- GUARD 3: per-brand rate ceiling --------------------------------------
// Catches a rule that eats one brand alive.
// Counts ONLY non-apparel vetoes. A brand-blacklisted or id-pinned brand is
// 100% rejected by definition and would otherwise trip this guard forever.
const byBrand = {};
for (const r of rejected) {
  if (!String(r.reason).startsWith('non-apparel:')) continue;
  byBrand[r.brandSlug] = (byBrand[r.brandSlug] || 0) + 1;
}
for (const [b, n] of Object.entries(byBrand)) {
  const total = raw.filter((p) => p.brandSlug === b).length;
  if (n / total > 0.25 && !expectedHot.has(b)) {
    throw new Error(
      `Brand ${b} is ${(100 * n / total).toFixed(0)}% non-apparel (${n}/${total}). ` +
      `If intended, add it to exclusions.json.brandNonApparelExpected.`,
    );
  }
}

// ---- GUARD 2: drift ratchet ------------------------------------------------
// Catches a regex that silently widens. Independent of the veto predicate, so it
// can go red on a category nobody enumerated.
const prev = existsSync(U('products.json')) ? JSON.parse(readFileSync(U('products.json'), 'utf8')).length : null;
const published = interleaveByBrand(kept);

// Write the audit trail BEFORE the ratchet can throw — the error message tells
// the operator to review these files, so they have to exist by then.
writeFileSync(U('rejected.json'), JSON.stringify(rejected, null, 2));
writeFileSync(U('review.json'), JSON.stringify(review, null, 2));

if (prev !== null && Math.abs(published.length - prev) > 40 && !process.env.ALLOW_LARGE_DIFF) {
  throw new Error(
    `Published count moved ${prev} -> ${published.length} (>40). ` +
    `products.json NOT written. Review data/rejected.json (${rejected.length} rows), ` +
    `then re-run with ALLOW_LARGE_DIFF=1 if intended.`,
  );
}

writeFileSync(U('products.json'), JSON.stringify(published, null, 2));

const byReason = rejected.reduce((a, r) => ((a[r.reason] = (a[r.reason] || 0) + 1), a), {});
console.table(byReason);
console.log(
  `Published ${published.length} products (mixed across ${new Set(published.map((p) => p.brandSlug)).size} brands) ` +
  `| rejected ${rejected.length} | review ${review.length}`,
);
