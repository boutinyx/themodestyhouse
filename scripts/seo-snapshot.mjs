#!/usr/bin/env node
/**
 * Capture a dated SEO snapshot: Search Console performance, per-URL index
 * coverage, and served page weight. Writes docs/seo/snapshot-YYYY-MM-DD.json.
 *
 * WHY THIS EXISTS
 * The 2026-08-19 audit shipped ~20 changes, each with a "how would we know this
 * failed?" check. Those checks are worthless without a before. This is the
 * before — and every later run is a comparable after, committed alongside it so
 * the history is in git rather than in someone's memory.
 *
 * It answers questions no single tool does at once:
 *   - did the 10 new ?type= pages ever get indexed?
 *   - did the 5 lanes we submitted on 2026-08-19 come out of "Discovered"?
 *   - did impressions move on the three lanes we deepened?
 *   - did page weight creep back up as the catalogue grew?
 *
 * AUTH. Uses gcloud Application Default Credentials — the same grant a human
 * set up interactively, NOT a committed key. Requires:
 *   gcloud auth application-default login --scopes=...,webmasters.readonly
 *   gcloud auth application-default set-quota-project <project>
 * The x-goog-user-project header is mandatory; without it the API 403s with
 * "requires a quota project", which reads like a permissions problem and isn't.
 *
 * Usage:  node scripts/seo-snapshot.mjs [--days 90]
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const SITE = 'sc-domain:themodestyhouse.com';
const ORIGIN = 'https://themodestyhouse.com';
const PROJECT = 'project-c18afb0a-80a5-42dd-97b';

const days = Number(process.argv[process.argv.indexOf('--days') + 1]) || 90;

function token() {
  try {
    return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    console.error('No ADC token. Run:\n  gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters.readonly');
    process.exit(1);
  }
}

const TOK = token();
const H = {
  Authorization: `Bearer ${TOK}`,
  'x-goog-user-project': PROJECT,
  'Content-Type': 'application/json',
};

const iso = (d) => d.toISOString().slice(0, 10);
// Dates are derived from the clock at run time and are the ONLY nondeterminism
// here — everything else is a measurement of live state.
const today = new Date();
const start = new Date(today.getTime() - days * 864e5);

async function gsc(path, body) {
  const r = await fetch(`https://searchconsole.googleapis.com/${path}`, {
    method: body ? 'POST' : 'GET', headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function perf(dimensions) {
  const d = await gsc(
    `webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { startDate: iso(start), endDate: iso(today), dimensions, rowLimit: 200 },
  );
  // A dimensionless query (dimensions: []) returns one row with NO `keys`
  // field — the site-wide total. Guard, or it throws on the totals call.
  return (d.rows ?? []).map((r) => ({
    key: (r.keys ?? []).join(' | ').replace(ORIGIN, '') || 'ALL',
    clicks: r.clicks, impressions: r.impressions,
    ctr: +(r.ctr * 100).toFixed(2), position: +r.position.toFixed(1),
  }));
}

async function inspect(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const d = await gsc('v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: SITE });
      const i = d.inspectionResult?.indexStatusResult ?? {};
      return {
        verdict: i.verdict ?? null,
        coverage: i.coverageState ?? null,
        lastCrawl: i.lastCrawlTime ? i.lastCrawlTime.slice(0, 10) : null,
        googleCanonical: (i.googleCanonical ?? '').replace(ORIGIN, '') || null,
      };
    } catch (e) {
      if (a === 2) return { error: String(e.message).slice(0, 120) };
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}

/** Uncompressed bytes actually served. Identity encoding on purpose: the point
 *  is parse cost on a phone, which compression does not reduce. */
async function weigh(url) {
  try {
    const r = await fetch(url, { headers: { 'accept-encoding': 'identity', 'user-agent': 'themodestyhouse-snapshot/1.0' } });
    const html = await r.text();
    return { status: r.status, bytes: Buffer.byteLength(html), words: html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length };
  } catch (e) { return { error: String(e.message).slice(0, 80) }; }
}

const sitemapXml = await (await fetch(`${ORIGIN}/sitemap.xml`, { headers: { 'user-agent': 'themodestyhouse-snapshot/1.0' } })).text();
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap: ${urls.length} URLs`);

const [totals, byPage, byQuery] = await Promise.all([perf([]), perf(['page']), perf(['query'])]);

console.log('inspecting…');
const coverage = {};
for (const u of urls) {
  coverage[u.replace(ORIGIN, '') || '/'] = await inspect(u);
  process.stdout.write('.');
}
console.log();

console.log('weighing…');
const WEIGH = ['/', '/directory', '/hijabi-outfits', '/modest-abayas', '/modest-dresses', '/modest-hijabs', '/designers'];
const weight = {};
for (const p of WEIGH) weight[p] = await weigh(ORIGIN + p);

const snap = {
  capturedAt: iso(today),
  window: { start: iso(start), end: iso(today), days },
  sitemapUrlCount: urls.length,
  performance: { totals: totals[0] ?? null, byPage, byQuery },
  coverage,
  weight,
  notes: 'Prices/currencies not captured — see ADR-0002. Coverage reflects Google state at capture, which lags deploys by days.',
};

mkdirSync('docs/seo', { recursive: true });
const out = `docs/seo/snapshot-${iso(today)}.json`;
writeFileSync(out, JSON.stringify(snap, null, 2));

const notIndexed = Object.entries(coverage).filter(([, v]) => v.verdict && v.verdict !== 'PASS');
console.log(`\nwrote ${out}`);
console.log(`  clicks ${snap.performance.totals?.clicks ?? 0} · impressions ${snap.performance.totals?.impressions ?? 0} · avg pos ${snap.performance.totals?.position ?? '—'}`);
console.log(`  indexed ${urls.length - notIndexed.length}/${urls.length}`);
for (const [p, v] of notIndexed) console.log(`    NOT INDEXED  ${p} — ${v.coverage}`);
