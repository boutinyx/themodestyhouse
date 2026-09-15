/**
 * Which published products now link to a page that is gone?
 *
 * The companion to scripts/storefront-health.mjs. That one asks whether a HOUSE
 * is still there and caught 718 products behind three dead storefronts on
 * 2026-09-03. This one asks whether a PRODUCT is still there on a house that is
 * perfectly alive — a sweep of 2,524 outbound URLs on 2026-09-15 found 50 such
 * products across 13 healthy storefronts, so nothing we had could see them.
 *
 * THE DETECTION RULE IS NOT THE STATUS CODE. A removed Shopify product answers
 * differently depending on the client: some send a 302 to the shop homepage,
 * some a hard 404, and the same URL does both depending on the request headers
 * — measured on voilechic.com, 2026-09-15, where Node's fetch got 200-after-
 * redirect-to-homepage and curl got 404 for the identical URL. 44 of those 50
 * dead products therefore answer 200 OK to any checker that follows redirects,
 * which is how an external SEO tool reported 10 of them rather than 50.
 *
 * So this does NOT trust the status. It follows redirects and judges by where
 * the response ENDED UP — lib/deadLink.ts::linkVerdict, which calls a 2xx that
 * landed anywhere other than the requested product `moved`. That verdict is
 * correct under both behaviours, which is the point. Read its header before
 * changing anything here.
 *
 * IT ONLY REPORTS. It writes nothing and unpublishes nothing: cutting a product
 * is `data/exclusions.json` or a `cut` decision, both human (Invariant 3), and a
 * brand having a bad minute must never be able to delete inventory (Invariant
 * 12). `unknown` — a timeout, a 429, a 5xx, a DNS failure — is never reported as
 * dead, which is the same rule Invariant 13 puts on the scraper.
 *
 * COST. 19k published rows is far too many to fetch nightly against other
 * people's shops. Default is a 1/7 rotating slice keyed to the day of the year,
 * so every product is checked about weekly and no house is hit hard on any one
 * night. Requests are serialised per host with a pause between them.
 *
 *   npm run audit:dead-links                  today's slice
 *   npm run audit:dead-links -- --all         every published product
 *   npm run audit:dead-links -- --brands aab veiled
 *   npm run audit:dead-links -- --limit 200   first N of the selection
 *   npm run audit:dead-links -- --json        machine-readable
 *   npm run audit:dead-links -- --strict      exit 1 if anything is broken
 *
 * Runs under tsx — it imports lib/deadLink.ts (Invariant 7).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { linkVerdict, isBroken } from '../lib/deadLink.ts';
import { mergeSweep, withheldIds, EMPTY_LEDGER } from '../lib/deadLinkLedger.ts';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, d) => {
  const i = argv.indexOf(f);
  return i === -1 ? d : argv[i + 1];
};

const ALL = has('--all');
const AS_JSON = has('--json');
const STRICT = has('--strict');
/** Fold this run into data/dead-links.json, which the publish reads. */
const WRITE = has('--write');
const LIMIT = Number(valueOf('--limit', '0')) || 0;
const BRANDS = (() => {
  const i = argv.indexOf('--brands');
  if (i === -1) return null;
  return new Set(argv.slice(i + 1).filter((a) => !a.startsWith('--')));
})();

/** Rotating slice: 1/SLICES of the catalogue per run, by day of the year. */
const SLICES = 7;
const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86_400_000);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const PER_HOST_PAUSE_MS = 700;
const HOST_CONCURRENCY = 6;
const TIMEOUT_MS = 25_000;

const raw = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const rows = Array.isArray(raw) ? raw : (raw.products ?? []);
if (!rows.length) {
  console.error('dead-links: data/products.json parsed to 0 rows — refusing to report "all clear" on nothing.');
  process.exit(1);
}

const selected = rows.filter((p, i) => {
  if (BRANDS) return BRANDS.has(p.brandSlug);
  if (ALL) return true;
  return i % SLICES === dayOfYear % SLICES;
});
const work = LIMIT ? selected.slice(0, LIMIT) : selected;

/** Group by host so each shop is hit serially, and shops run in parallel. */
const byHost = new Map();
for (const p of work) {
  let host;
  try { host = new URL(p.url).hostname; } catch { continue; }
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push(p);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    // redirect: 'follow' + res.url is the measurement that matters — the status
    // alone cannot tell a live product from a shop homepage (file header).
    const res = await fetch(url, { redirect: 'follow', signal: c.signal, headers: { 'user-agent': UA } });
    return { url, status: res.status, finalUrl: res.url || null };
  } catch (e) {
    return { url, status: null, finalUrl: null, error: String(e?.message ?? e) };
  } finally {
    clearTimeout(t);
  }
}

async function sweepHost(host, items) {
  const out = [];
  for (const p of items) {
    const r = await probe(p.url);
    out.push({ ...p, verdict: linkVerdict(r), status: r.status, finalUrl: r.finalUrl, error: r.error });
    await sleep(PER_HOST_PAUSE_MS);
  }
  return out;
}

const hosts = [...byHost.entries()];
const results = [];
for (let i = 0; i < hosts.length; i += HOST_CONCURRENCY) {
  const batch = hosts.slice(i, i + HOST_CONCURRENCY);
  const done = await Promise.all(batch.map(([h, items]) => sweepHost(h, items)));
  for (const d of done) results.push(...d);
  if (!AS_JSON) process.stderr.write(`  …${Math.min(i + HOST_CONCURRENCY, hosts.length)}/${hosts.length} shops\n`);
}

const broken = results.filter((r) => isBroken(r.verdict));
const unknown = results.filter((r) => r.verdict === 'unknown');

// --write folds this sweep into data/dead-links.json, which scripts/build-data.mjs
// reads at publish time. The ledger decides what is acted on (lib/deadLinkLedger.ts):
// a hard 404 once, a redirect twice, a brand-wide failure never. The file is
// committed by .github/workflows/dead-links.yml so the next publish sees it.
const LEDGER_PATH = new URL('../data/dead-links.json', import.meta.url);
let ledgerSummary = null;
if (WRITE) {
  const before = existsSync(LEDGER_PATH)
    ? JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
    : EMPTY_LEDGER;
  const after = mergeSweep(
    before,
    results.map(({ id, brandSlug, url, verdict }) => ({ id, brandSlug, url, verdict })),
    new Date().toISOString(),
  );
  writeFileSync(LEDGER_PATH, `${JSON.stringify(after, null, 2)}\n`);
  const held = withheldIds(after);
  ledgerSummary = {
    tracked: Object.keys(after.entries).length,
    willBeWithheld: held.size,
    brandWideHeldBack: Object.values(after.entries).filter((e) => e.brandWide).length,
    wasTracked: Object.keys(before.entries ?? {}).length,
  };
}

if (AS_JSON) {
  console.log(JSON.stringify({
    checked: results.length,
    ok: results.length - broken.length - unknown.length,
    broken: broken.length,
    unknown: unknown.length,
    selection: BRANDS ? 'brands' : ALL ? 'all' : `slice ${dayOfYear % SLICES + 1}/${SLICES}`,
    rows: broken.map(({ id, brandSlug, title, url, verdict, status, finalUrl }) => ({ id, brandSlug, title, url, verdict, status, finalUrl })),
  }, null, 2));
} else {
  const sel = BRANDS ? `brands ${[...BRANDS].join(', ')}` : ALL ? 'every published product' : `slice ${dayOfYear % SLICES + 1} of ${SLICES}`;
  console.log(`\ndead-links — ${sel}`);
  console.log(`checked ${results.length} of ${rows.length} published rows across ${hosts.length} shops\n`);

  const byBrand = new Map();
  for (const b of broken) {
    if (!byBrand.has(b.brandSlug)) byBrand.set(b.brandSlug, []);
    byBrand.get(b.brandSlug).push(b);
  }
  if (!byBrand.size) {
    console.log('  no broken product links in this selection');
  } else {
    for (const [slug, items] of [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${slug}  ${items.length} broken`);
      for (const it of items.slice(0, 10)) {
        const where = it.verdict === 'moved' ? ` -> ${it.finalUrl}` : '';
        console.log(`     ${it.verdict.toUpperCase().padEnd(5)} ${it.status ?? '---'}  ${it.title}\n           ${it.url}${where}`);
      }
      if (items.length > 10) console.log(`     …and ${items.length - 10} more`);
    }
  }
  console.log(`\n  ok ${results.length - broken.length - unknown.length} · broken ${broken.length} · unknown ${unknown.length}`);
  if (unknown.length) {
    // §10.44: a check that could not complete is its own bucket, never a finding
    // about the brand. Printed so a sweep that mostly failed cannot read as clean.
    const hostsUnknown = [...new Set(unknown.map((u) => { try { return new URL(u.url).hostname; } catch { return '?'; } }))];
    console.log(`  unknown covers ${hostsUnknown.length} shops: ${hostsUnknown.slice(0, 8).join(', ')}${hostsUnknown.length > 8 ? ' …' : ''}`);
  }
  if (ledgerSummary) {
    console.log(`\n  data/dead-links.json: ${ledgerSummary.wasTracked} tracked -> ${ledgerSummary.tracked}`);
    console.log(`  the next publish will withhold ${ledgerSummary.willBeWithheld} products`);
    if (ledgerSummary.brandWideHeldBack) {
      console.log(`  ${ledgerSummary.brandWideHeldBack} rows are flagged brand-wide and are deliberately NOT withheld — a storefront-level failure is a human decision`);
    }
    console.log('\n  Withholding is reversible and automatic: the row returns on the first publish after its link works again.\n');
  } else {
    console.log('\n  Nothing was changed. Re-run with --write to fold this into data/dead-links.json.\n');
  }
}

process.exit(STRICT && broken.length ? 1 : 0);
