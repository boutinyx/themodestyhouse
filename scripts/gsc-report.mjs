#!/usr/bin/env node
/**
 * Weekly Search Console report for themodestyhouse.com. READ-ONLY.
 *
 * Auth is gcloud ADC (Tina's login) — the .env API key cannot read Search Console and service-account
 * keys are blocked on this project, so this can only run on a machine that has `gcloud` logged in.
 * See memory `google-search-console-access`. It is run weekly by launchd (scripts/gsc-report.plist).
 *
 * Writes .audit/gsc/report-<date>.md and .audit/gsc/latest.json (gitignored). Compares against the
 * previous run. Any failure — no token, API error, empty data — prints, exits non-zero and raises a
 * macOS notification: a check that fails silently reads as green (CLAUDE.md §10.28).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'sc-domain%3Athemodestyhouse.com';
const PID = 'project-c18afb0a-80a5-42dd-97b';
const OUT = new URL('../.audit/gsc/', import.meta.url).pathname;
const BASE_IMG_PAGES = 27; // designer pages with image impressions, 2026-06-21..2026-09-20 (docs/log/2026-09-21-*)

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 864e5));

function notify(msg) {
  try { execFileSync('osascript', ['-e', `display notification ${JSON.stringify(msg)} with title "Modesty House SEO"`]); } catch {}
}
function fail(msg) { console.error('GSC REPORT FAILED:', msg); notify('GSC report FAILED: ' + msg); process.exit(1); }

let token;
try { token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8' }).trim(); }
catch (e) { fail('no gcloud token — run: gcloud auth application-default login'); }

async function query(body) {
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${SITE}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': PID, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) fail(`API ${r.status}: ${JSON.stringify(j.error ?? j).slice(0, 200)}`);
  return j.rows ?? [];
}

// Search Console lags ~2 days; a 28-day window ending 3 days ago.
const end = daysAgo(3), start = daysAgo(31);
const win = { startDate: start, endDate: end, rowLimit: 1000 };
const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);

const imgPages = await query({ ...win, searchType: 'image', dimensions: ['page'] });
const webPages = await query({ ...win, searchType: 'web', dimensions: ['page'] });
const webQP = await query({ ...win, searchType: 'web', dimensions: ['query', 'page'], rowLimit: 1000 });
if (webPages.length === 0) fail('web search returned zero rows — data missing, not "no traffic"');

const path = (u) => u.replace('https://themodestyhouse.com', '') || '/';
const designer = (u) => /\/designers\/[^/?]+$/.test(u);
const imgDesigners = imgPages.filter((r) => designer(r.keys[0]));

const cur = {
  date: iso(new Date()), window: `${start}..${end}`,
  image: { impressions: sum(imgPages, 'impressions'), clicks: sum(imgPages, 'clicks'), pages: imgPages.length, designerPages: imgDesigners.length },
  web: { impressions: sum(webPages, 'impressions'), clicks: sum(webPages, 'clicks'), pages: webPages.length },
  pos: Object.fromEntries(webPages.map((r) => [path(r.keys[0]), +r.position.toFixed(1)])),
};

mkdirSync(OUT, { recursive: true });
const prev = existsSync(OUT + 'latest.json') ? JSON.parse(readFileSync(OUT + 'latest.json', 'utf8')) : null;
const d = (a, b) => (prev ? ` (${a - b >= 0 ? '+' : ''}${a - b} vs last run)` : '');

const near = webQP.filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 8)
  .sort((a, b) => b.impressions - a.impressions).slice(0, 10);
const movers = prev ? Object.entries(cur.pos).map(([p, v]) => [p, v, prev.pos[p]]).filter(([, , o]) => o !== undefined)
  .map(([p, v, o]) => [p, v, o, o - v]).filter(([, , , m]) => Math.abs(m) >= 3).sort((a, b) => Math.abs(b[3]) - Math.abs(a[3])).slice(0, 8) : [];

const md = [
  `# Search Console report — ${cur.date}`, `Window ${cur.window} (28 days, ends 3 days ago: Search Console lags).`, '',
  `**Image search:** ${cur.image.impressions} impressions${d(cur.image.impressions, prev?.image.impressions)}, ${cur.image.clicks} clicks, ${cur.image.pages} pages`,
  `**Designer pages with any image impression:** ${cur.image.designerPages} (baseline ${BASE_IMG_PAGES} of 91 before the image sitemap, 2026-09-21)`,
  `**Web search:** ${cur.web.impressions} impressions${d(cur.web.impressions, prev?.web.impressions)}, ${cur.web.clicks} clicks${d(cur.web.clicks, prev?.web.clicks)}, ${cur.web.pages} pages`, '',
  '## Near page one (position 8-20, 8+ impressions)',
  ...near.map((r) => `- ${r.keys[0]} — ${path(r.keys[1])} — pos ${r.position.toFixed(1)}, ${r.impressions} impr`), '',
  '## Biggest position moves (3+ places)',
  ...(prev ? (movers.length ? movers.map(([p, v, o]) => `- ${p}: ${o} -> ${v}`) : ['- none']) : ['- first run, nothing to compare']),
].join('\n');

writeFileSync(OUT + `report-${cur.date}.md`, md + '\n');
writeFileSync(OUT + 'latest.json', JSON.stringify(cur));
console.log(md);
notify(`Image impr ${cur.image.impressions}, designer pages in Images ${cur.image.designerPages}/91, web clicks ${cur.web.clicks}. Report in .audit/gsc/`);
