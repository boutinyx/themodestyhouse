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
const HOST = 'themodestyhouse.com';
const KEY = 'cee9f84f266c58db70309c208ab4496a';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

/**
 * URLs come from the DEPLOYED sitemap.xml, not a hardcoded list.
 *
 * They used to be hardcoded here, "duplicated rather than imported so this
 * script has zero dependency on the app's TS module graph". The dependency
 * argument was right; the duplication was not. By 2026-08-19 the list had
 * drifted to 12 of 14 lanes — missing /layering-basics and /outerwear, both
 * of which had been in sitemap.xml for days — and knew nothing about the 10
 * new ?type= subtype pages. Exactly the failure public/llms.txt had, for
 * exactly the same reason.
 *
 * Reading the live sitemap keeps the zero-TS-dependency property (it is one
 * fetch and a regex) while making drift structurally impossible: app/sitemap.ts
 * is already generated from LANES + lib/laneSubtypes + getPosts(). It also means
 * this submits what is ACTUALLY deployed rather than what the local checkout
 * believes, which is the right thing to tell a crawler about.
 *
 * Note IndexNow is Bing/Yandex/Naver/Seznam — NOT Google, which does not
 * participate. Google's only equivalent is the Request Indexing button in the
 * Search Console UI, which has no public API.
 */
const SITEMAP = `https://${HOST}/sitemap.xml`;

const xml = await fetch(SITEMAP, { headers: { 'user-agent': 'themodestyhouse-indexnow/1.0' } })
  .then((r) => {
    if (!r.ok) throw new Error(`sitemap fetch failed: HTTP ${r.status}`);
    return r.text();
  });

const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

if (urlList.length === 0) {
  console.error('IndexNow: sitemap returned no <loc> entries — refusing to submit an empty set.');
  process.exit(1);
}

console.log(`Submitting ${urlList.length} URLs to IndexNow (from ${SITEMAP})...`);

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
