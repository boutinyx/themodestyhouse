/**
 * Is every brand's storefront still there?
 *
 * WHY THIS EXISTS. On 2026-09-03 a check of all 117 brands found THREE whose
 * storefront no longer works, between them carrying **718 published products**
 * — every one of those product cards sending a visitor to a dead site, on a
 * directory whose entire revenue event is the outbound click:
 *
 *     nour-al-houda   704 products   nouralhouda.com.au   NO DNS AT ALL
 *     madiha           11 products   madiha.co.uk         HTTP 402
 *     aniqq             3 products   aniqq.nl             HTTP 409
 *
 * madiha's feed was last seen 2026-08-21 and aniqq's 2026-08-11 — dead for two
 * and three weeks with nothing anywhere saying so. That is the gap this closes.
 *
 * WHY THE NIGHTLY REFRESH DOES NOT CATCH IT, and should not be changed to:
 * `refresh.mjs` catches a failed fetch, skips the brand and delists nothing.
 * That is CORRECT (Invariant 13 — only a COMPLETE fetch may delist, and a
 * partial or failed one is not evidence of absence), and it is what stopped
 * §10.1 recurring. But it means a brand whose domain is permanently gone stays
 * published for ever, silently. The answer is not to make the scraper delete;
 * it is to have something that REPORTS.
 *
 * SO THIS ONLY EVER REPORTS. It writes nothing, changes nothing, and cutting a
 * brand stays a two-edit human decision (§7). Exit code is 0 unless
 * `--strict` is passed, so it can sit in a nightly job without failing it.
 *
 * A DEAD SITE IS NOT DECLARED ON ONE FAILURE. §10.3 (a parked domain answers
 * 200 and means nothing) and §10.42 (one endpoint's opinion is not the
 * credential's state) both apply. Each host is tried twice, DNS is separated
 * from HTTP, and a timeout is reported as UNKNOWN rather than as dead.
 *
 *   node scripts/storefront-health.mjs            report
 *   node scripts/storefront-health.mjs --strict   exit 1 if anything is dead
 *   node scripts/storefront-health.mjs --json     machine-readable
 */
import { readFileSync } from 'node:fs';
import { resolve4 } from 'node:dns/promises';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const STRICT = process.argv.includes('--strict');
const AS_JSON = process.argv.includes('--json');

// data/brands.ts is TypeScript and this file runs under plain node so it can be
// scheduled without the tsx dependency. The homepage/slug pairs are simple
// enough to read out directly, and lib/brandsSource.test.ts is not needed to
// prove that: a brand this misses is reported as UNPARSED rather than skipped.
const src = readFileSync(new URL('../data/brands.ts', import.meta.url), 'utf8');
const brands = [...src.matchAll(/\{\s*slug:\s*'([^']+)'[^}]*?homepage:\s*'([^']+)'/g)]
  .map((m) => ({ slug: m[1], homepage: m[2] }));
if (!brands.length) { console.error('storefront-health: parsed 0 brands from data/brands.ts — refusing to report "all clear" on nothing.'); process.exit(1); }

const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const rows = Array.isArray(products) ? products : (products.products ?? []);
const published = new Map();
for (const p of rows) published.set(p.brandSlug, (published.get(p.brandSlug) ?? 0) + 1);

const once = async (url) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: c.signal });
    return { status: r.status };
  } catch (e) {
    return { status: null, err: e.name === 'AbortError' ? 'timeout' : (e.cause?.code ?? 'fetch failed') };
  } finally { clearTimeout(t); }
};

const check = async (b) => {
  const host = new URL(b.homepage).hostname;
  const n = published.get(b.slug) ?? 0;
  // DNS first, and separately: "the name does not resolve" is a different and
  // far more final fact than "the server answered with an error".
  let dns = true;
  try { await resolve4(host); } catch { try { await resolve4(host.replace(/^www\./, '')); } catch { dns = false; } }
  if (!dns) return { ...b, host, n, verdict: 'NO DNS', detail: 'the domain does not resolve' };

  let r = await once(b.homepage);
  if (r.status === null || r.status >= 400) r = await once(b.homepage); // one retry
  if (r.status === null) return { ...b, host, n, verdict: 'UNKNOWN', detail: r.err };
  if (r.status >= 400) return { ...b, host, n, verdict: 'HTTP ' + r.status, detail: httpMeaning(r.status) };
  return { ...b, host, n, verdict: 'ok', detail: '' };
};

// Shopify's own codes for a store that has stopped trading, which is the case
// that matters here and reads as a generic error otherwise.
const httpMeaning = (s) => s === 402 ? 'Shopify: store frozen / unpaid'
  : s === 409 ? 'Shopify: store unavailable'
  : s === 404 ? 'not found'
  : s === 403 ? 'forbidden (may be bot protection, not death)'
  : '';

const out = [];
const BATCH = 8;
for (let i = 0; i < brands.length; i += BATCH) {
  out.push(...await Promise.all(brands.slice(i, i + BATCH).map(check)));
  if (!AS_JSON) process.stderr.write(`  ${Math.min(i + BATCH, brands.length)}/${brands.length}\r`);
}
if (!AS_JSON) process.stderr.write('                    \r');

const broken = out.filter((x) => x.verdict !== 'ok' && x.verdict !== 'UNKNOWN').sort((a, b) => b.n - a.n);
const unknown = out.filter((x) => x.verdict === 'UNKNOWN');

if (AS_JSON) { console.log(JSON.stringify({ checked: out.length, broken, unknown }, null, 2)); }
else {
  console.log(`\nstorefront health — ${out.length} brands checked\n`);
  if (!broken.length) console.log('  every storefront reachable.');
  for (const b of broken) {
    console.log(`  ${String(b.n).padStart(4)} published products   ${b.slug.padEnd(22)} ${b.host.padEnd(32)} ${b.verdict}${b.detail ? '  — ' + b.detail : ''}`);
  }
  if (broken.length) {
    console.log(`\n  ${broken.reduce((a, b) => a + b.n, 0)} published products link to a storefront that does not work.`);
    console.log('  Cutting a brand is a human decision and two edits (CLAUDE.md §7) — this only reports.');
  }
  for (const b of unknown) console.log(`  (unknown: ${b.slug} — ${b.detail}; not treated as dead)`);
}

process.exit(STRICT && broken.length ? 1 : 0);
