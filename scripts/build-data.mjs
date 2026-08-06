// Publish step: raw + decisions + exclusions -> data/products.json
//
// NOTE: this now imports lib/nonApparel.ts, so it MUST run under tsx
// (`npm run build:data`), not bare `node`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isNonApparel } from '../lib/nonApparel.ts';
import { isLifecycleLive, stripLifecycle, brandDropViolations } from '../lib/lifecycle.ts';
import { demoteGarment } from '../lib/ordering.ts';
import { isSpecialty } from '../lib/specialty.ts';

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

// Lifecycle counters, reported separately: `delisted` is the merchants' doing
// (ordinary churn), `filtered` is ours (possibly a classifier regression).
let delistedCount = 0;

const kept = raw.filter((p) => {
  if (decisions[p.id] !== 'keep' || !p.inStock) return false;
  if (p.delistedAt) { delistedCount++; return false; }
  if (p.filteredAt) {
    // Actionable: the brand still sells this, our own rules dropped it.
    review.push({ id: p.id, title: p.title, url: p.url, why: `filtered:${p.filterReason || 'unknown'}` });
    return false;
  }
  if (!isLifecycleLive(p)) return false;
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

// ---- GUARD 2: per-brand collapse guard -------------------------------------
// Replaces the old global `Math.abs(published - prev) > 40` ratchet, which a
// real refresh would trip every single time (churn across 32 brands moves the
// total by hundreds) and which let losses cancel out against gains — a brand
// whose feed died could vanish entirely while the total barely moved.
const countByBrand = (rows) => rows.reduce((a, p) => ((a[p.brandSlug] = (a[p.brandSlug] || 0) + 1), a), {});
const prevRows = existsSync(U('products.json')) ? JSON.parse(readFileSync(U('products.json'), 'utf8')) : null;
// Brand round-robin first, then push abayas lower. Abayas are ~37% of the
// browsable catalogue and dominated the scroll; this thins them to ~15% over the
// first 100 and blends back to their natural share by ~300. Their order relative
// to each other is untouched, so /modest-abayas is unaffected (lib/ordering.ts).
// The predicate MUST match browseProducts() in lib/products.ts — that is the
// sequence the shopper sees, and capping against any other one moves abayas the
// wrong way (measured: 12% -> 21% when computed over the raw list).
const inMixedGrid = (p) => p.garment !== 'hijab' && !isSpecialty(p);
const published = demoteGarment(interleaveByBrand(kept), 'abaya', inMixedGrid);

// Write the audit trail BEFORE the guard can throw — the error message tells
// the operator to review these files, so they have to exist by then.
writeFileSync(U('rejected.json'), JSON.stringify(rejected, null, 2));
writeFileSync(U('review.json'), JSON.stringify(review, null, 2));

if (prevRows && !process.env.ALLOW_LARGE_DIFF) {
  const drops = brandDropViolations(countByBrand(prevRows), countByBrand(published));
  if (drops.length) {
    throw new Error(
      `products.json NOT written — ${drops.length} brand(s) collapsed:\n` +
      drops.map((d) => `  ${d.brandSlug}: ${d.prev} -> ${d.next} (-${(d.pct * 100).toFixed(0)}%)`).join('\n') +
      `\nA dead feed or a broken filter looks exactly like this. Review data/rejected.json ` +
      `(${rejected.length} rows) and data/refresh-report.json, then re-run with ALLOW_LARGE_DIFF=1 if intended.`,
    );
  }
}

// Lifecycle bookkeeping is raw-side only: ~5k rows of firstSeen/lastSeen would
// add ~150 KB to this file AND to every RSC payload (§8's real scaling ceiling).
writeFileSync(U('products.json'), JSON.stringify(published.map(stripLifecycle), null, 2));

const byReason = rejected.reduce((a, r) => ((a[r.reason] = (a[r.reason] || 0) + 1), a), {});
console.table(byReason);
console.log(
  `Published ${published.length} products (mixed across ${new Set(published.map((p) => p.brandSlug)).size} brands) ` +
  `| rejected ${rejected.length} | review ${review.length} | delisted-by-brand ${delistedCount}`,
);
