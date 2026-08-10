// Fetch FX rates into data/fx-rates.json.
//
// BUILD-TIME, not runtime, and deliberately so: the site is prerendered and the
// rates are only used for an APPROXIMATE display conversion (see ADR-0002), so a
// live per-request lookup would add a network dependency and a failure mode for
// no accuracy that matters. Re-run this when you want fresher rates.
//
// The file it writes is committed, so a build never depends on the API being up.
//
//   node scripts/fetch-rates.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const OUT = new URL('../data/fx-rates.json', import.meta.url);
const SOURCE = 'https://open.er-api.com/v6/latest/USD';

// Every currency the catalogue actually uses — DERIVED from data/brands.ts, not
// listed here. It used to be a literal array with a comment asking the next
// person to "keep in step with data/brands.ts", and on 2026-08-10 a batch of 48
// brands introduced 8 new currencies and it did not get kept in step: SEK, TRY,
// SGD, IDR, NOK, QAR, KWD and DKK all published with no rate, and lib/fx.test.ts
// was the only thing that noticed.
//
// Read as TEXT rather than imported, deliberately: this script runs under plain
// `node` (see package.json), and importing a .ts module would need tsx —
// Invariant 7. A regex over the one source of truth beats a second copy of it.
const BRANDS_SRC = readFileSync(new URL('../data/brands.ts', import.meta.url), 'utf8');
const WANTED = [...new Set([...BRANDS_SRC.matchAll(/currency:\s*'([A-Z]{3})'/g)].map((m) => m[1]))].sort();
if (WANTED.length < 5) throw new Error(`only ${WANTED.length} currencies parsed from data/brands.ts — the shape changed`);

const res = await fetch(SOURCE, { headers: { 'User-Agent': 'themodestyhouse/1.0' } });
if (!res.ok) throw new Error(`rates fetch failed: HTTP ${res.status}`);
const data = await res.json();
if (!data?.rates) throw new Error('rates fetch returned no rates');

const rates = {};
const missing = [];
for (const c of WANTED) {
  const r = c === 'USD' ? 1 : data.rates[c];
  if (typeof r !== 'number' || !(r > 0)) missing.push(c);
  else rates[c] = r;
}
if (missing.length) throw new Error(`source is missing rates for: ${missing.join(', ')}`);

// Refuse a wild swing rather than silently publishing nonsense prices. A real
// move of >25% against the previous file is far more likely to be a bad payload
// than a real market event.
if (existsSync(OUT)) {
  const prev = JSON.parse(readFileSync(OUT, 'utf8'));
  const wild = Object.entries(rates).filter(([c, r]) => {
    const p = prev.rates?.[c];
    return typeof p === 'number' && p > 0 && Math.abs(r - p) / p > 0.25;
  });
  if (wild.length && !process.env.ALLOW_WILD_FX) {
    throw new Error(
      `rate moved >25% for ${wild.map(([c]) => c).join(', ')}. ` +
      `Check the source, then re-run with ALLOW_WILD_FX=1 if it is genuine.`,
    );
  }
}

const out = {
  base: 'USD',
  // Source's own timestamp, not ours — this is when the RATES are from.
  fetchedAt: data.time_last_update_utc ?? new Date().toISOString(),
  source: SOURCE,
  rates,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote data/fx-rates.json — ${Object.keys(rates).length} currencies, as of ${out.fetchedAt}`);
