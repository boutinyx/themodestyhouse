// Publish step: raw + decisions + exclusions -> data/products.json
//
// NOTE: this now imports lib/nonApparel.ts, so it MUST run under tsx
// (`npm run build:data`), not bare `node`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isNonApparel } from '../lib/nonApparel.ts';
import { isLifecycleLive, stripLifecycle, brandDropViolations } from '../lib/lifecycle.ts';
import { demoteGarment } from '../lib/ordering.ts';
import { isSpecialty } from '../lib/specialty.ts';
import { normalizeTitle, stripRawSignals } from '../lib/normalize.ts';
import { resolveGarment } from '../lib/garmentReview.ts';

const U = (f) => new URL(`../data/${f}`, import.meta.url);

const raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));
const decisions = existsSync(U('decisions.json')) ? JSON.parse(readFileSync(U('decisions.json'), 'utf8')) : {};
// Manual garment corrections from the /admin/review UI. Checked FIRST in the
// re-derivation below, and never written by any automated path — the same
// separation decisions.json already relies on (§10.13: automation must never
// silently revisit a human decision).
const garmentOverrides = existsSync(U('garment-overrides.json'))
  ? JSON.parse(readFileSync(U('garment-overrides.json'), 'utf8'))
  : {};

// Persistent exclusion list (men's items, cut brands, pinned ids). This is a
// women's modest-fashion directory; see data/exclusions.json. Enforced here so a
// rebuild can never reintroduce excluded items.
const excl = JSON.parse(readFileSync(U('exclusions.json'), 'utf8'));

/* Title translation, applied HERE at publish time rather than by the Python
 * post-hook. This is the fix for a regression that ran for as long as the
 * nightly refresh has existed.
 *
 * What was wrong: `postbuild:data` / `postrefresh` call `npm run translate`,
 * which is guarded on `[ -x .venv-style/bin/python ]`. The GitHub runner in
 * .github/workflows/refresh.yml sets up Node and nothing else, so that guard is
 * always false in CI — the hook prints "skipped" and the refresh commits and
 * pushes untranslated titles. A local publish translated them, the next nightly
 * refresh reverted them, and neither left a mark. Measured 2026-08-10: 561
 * published rows carrying Dutch and French titles whose English versions were
 * sitting in the committed cache the whole time.
 *
 * Why applying the cache is enough, and why there is no network call here: the
 * cache is keyed by the ORIGINAL feed title and raw-products.json still holds
 * those originals, so a pure lookup translates everything the cache knows —
 * 2,238 rows as of today — deterministically, with no Python, no venv and no
 * HTTP. scripts/translate_titles.py keeps its job: it POPULATES the cache for
 * titles never seen before, which does need the network. That split means CI
 * can never again publish a title the project has already translated.
 *
 * The two files are read defensively. A missing translate-brands.json means "no
 * brand needs translating", which is the correct reading of an absent list, and
 * a missing cache means "nothing translated yet" — neither should fail a build
 * whose real job is publishing the catalogue.
 */
const translateBrands = existsSync(U('translate-brands.json'))
  ? JSON.parse(readFileSync(U('translate-brands.json'), 'utf8'))
  : {};
const titleCache = existsSync(U('title-translations.json'))
  ? JSON.parse(readFileSync(U('title-translations.json'), 'utf8'))
  : {};
const translationStats = { translated: 0, uncached: 0 };

/** The published title: cleaned, and translated when the brand is non-English.
 *
 *  Looked up under BOTH the cleaned and the raw title. translate_titles.py reads
 *  products.json, i.e. titles that have already been through normalizeTitle, so
 *  its keys are cleaned ones — but rows scraped before a normalizeTitle change
 *  are keyed raw. Checking both is what keeps old cache entries usable instead
 *  of silently missing and re-translating.
 */
function publishTitle(p) {
  const cleaned = normalizeTitle(p.title);
  if (!translateBrands[p.brandSlug]) return cleaned;
  const hit = titleCache[cleaned] ?? titleCache[p.title];
  if (hit) {
    if (hit !== cleaned) translationStats.translated += 1;
    return normalizeTitle(hit);
  }
  // Not a failure — just a title the cache has not seen. Counted and reported
  // so the gap is visible rather than silent; run scripts/translate_titles.py
  // locally to fill it.
  translationStats.uncached += 1;
  return cleaned;
}
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
  // A product with no price is not a product a shopper can act on. Found when
  // the 2026-08-10 batch surfaced 12 rows priced 0 — İpekstil's "Kombin Kutusu"
  // (outfit-box) configurators and one Vivi Zubedi row, all of which list no
  // price in the feed at all. `lib/catalogue.test.ts` already treats price 0 as
  // an unpopulated required field, so the pipeline agreeing with it is the fix;
  // the alternative was 12 hand-written ids in exclusions.json that would say
  // nothing about the next feed that does this.
  if (!(p.price > 0)) {
    review.push({ id: p.id, title: p.title, url: p.url, why: 'no-price' });
    return false;
  }
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
  const decision = resolveGarment(p, garmentOverrides);
  if (decision.status === 'held') {
    review.push({
      id: p.id, title: p.title, url: p.url, why: decision.why,
      titleGuess: decision.titleGuess, typeGuess: decision.typeGuess,
    });
    return false;
  }
  // Safe: `raw` was freshly parsed this run and nothing reads `p` before this
  // point in the pipeline — interleaveByBrand/demoteGarment/publishTitle all
  // run AFTER this filter, so they see the resolved value.
  p.garment = decision.garment;
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
// Re-clean AND translate titles at PUBLISH time, not just at ingest. build-data
// never re-runs normalizeProduct, so rows scraped before a normalizeTitle change
// keep their old title forever — that is the "raw rows are frozen" landmine in
// CLAUDE.md §8. Doing it here fixes 141 titles showing a literal "&#8211;" and
// 460 SHOUTING titles across every brand, with no re-scrape — and, since
// 2026-08-10, applies the translation cache so CI cannot publish a title the
// project has already translated. See publishTitle() above.
const published = demoteGarment(interleaveByBrand(kept), 'abaya', inMixedGrid)
  .map((p) => ({ ...p, title: publishTitle(p) }));

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

// Most lifecycle bookkeeping is raw-side only and stripped here — lastSeen on
// ~23k rows would add real weight to this file AND to every RSC payload (§8's
// real scaling ceiling). firstSeen is the one exception: it's now a published
// field (stripLifecycle keeps it) so the Sort control's Newest/Oldest options
// have real data — see lib/lifecycle.ts and lib/compactCatalogue.ts.
writeFileSync(U('products.json'), JSON.stringify(published.map(stripLifecycle).map(stripRawSignals), null, 2));

const byReason = rejected.reduce((a, r) => ((a[r.reason] = (a[r.reason] || 0) + 1), a), {});
console.table(byReason);
console.log(
  `Published ${published.length} products (mixed across ${new Set(published.map((p) => p.brandSlug)).size} brands) ` +
  `| rejected ${rejected.length} | review ${review.length} | delisted-by-brand ${delistedCount}`,
);
// Reported unconditionally, including the zeroes. The regression this replaced
// was invisible precisely because the skipped hook printed a cheerful
// "title-translation skipped" and nothing downstream ever counted the result.
console.log(
  `Titles: ${translationStats.translated} translated from cache` +
  (translationStats.uncached
    ? ` | ${translationStats.uncached} in non-English brands NOT in the cache ` +
      `— run scripts/translate_titles.py locally to fill them`
    : ' | cache covers every non-English title'),
);
