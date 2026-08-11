#!/usr/bin/env node
/**
 * Notify IndexNow (Bing, Yandex, Naver, Seznam.cz — not Google, which doesn't
 * participate) that a batch of pages changed. Self-contained: no TS imports,
 * no dependency on the claude-seo tool being installed, so it stays portable
 * to CI/Railway even though nothing wires it into automation today.
 *
 * Deliberately NOT hooked into `postbuild:data`/`postrefresh`. Those run in
 * CI on a schedule and are already documented as fragile (CLAUDE.md §8); this
 * is a manually-run notification, not a pipeline dependency. Run it by hand
 * after a real content/template change: `node scripts/indexnow-notify.mjs`.
 *
 * The key is not a secret — the IndexNow protocol requires it to be served
 * publicly at KEY_LOCATION specifically so the endpoint can verify domain
 * ownership. Hardcoding it here matches hardcoding it in public/<key>.txt.
 */
import { readdirSync } from 'node:fs';

const HOST = 'themodestyhouse.com';
const KEY = 'cee9f84f266c58db70309c208ab4496a';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Mirrors app/sitemap.ts's staticPaths + LANES — duplicated rather than
// imported so this script has zero dependency on the app's TS module graph
// (Invariant 7: .ts imports need tsx; this stays a plain, portable .mjs).
const STATIC_PATHS = ['', '/directory', '/editorial', '/about', '/designers', '/faq', '/contact', '/privacy', '/terms'];
const LANE_SLUGS = [
  'modest-dresses', 'modest-abayas', 'modest-hijabs', 'modest-skirts', 'modest-tops',
  'modest-trousers', 'modest-sets', 'modest-swimwear', 'modest-activewear',
  'hijabi-outfits', 'modest-wedding-guest', 'modest-summer-outfits',
];
const postSlugs = readdirSync(new URL('../content/editorial', import.meta.url))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

const urlList = [
  ...STATIC_PATHS.map((p) => `https://${HOST}${p}`),
  ...LANE_SLUGS.map((s) => `https://${HOST}/${s}`),
  ...postSlugs.map((s) => `https://${HOST}/editorial/${s}`),
];

console.log(`Submitting ${urlList.length} URLs to IndexNow...`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow: accepted (HTTP ${res.status}).`);
} else {
  const body = await res.text().catch(() => '');
  console.error(`IndexNow: HTTP ${res.status}${body ? ` — ${body.slice(0, 300)}` : ''}`);
  process.exitCode = 1;
}
