#!/usr/bin/env node
/**
 * Notify IndexNow (Bing, Yandex, Naver, Seznam.cz — NOT Google, which does not
 * participate) that the site's pages changed. Self-contained: no TS imports, no
 * npm dependencies, nothing but global fetch, so it runs in CI with a bare
 * `actions/checkout` + `setup-node` and no `npm ci`.
 *
 * Run by hand:   npm run seo:indexnow
 * Preview only:  npm run seo:indexnow -- --dry
 * Automated:     .github/workflows/indexnow.yml, on every push to main that
 *                touches something a visitor can see, and from the nightly
 *                catalogue refresh. See docs/log/2026-08-27-indexnow-automation.md.
 *
 * The key is NOT a secret. The protocol requires it to be served publicly at
 * KEY_LOCATION precisely so the endpoint can verify domain ownership, so it is
 * hardcoded here exactly as it is in public/<key>.txt. INDEXNOW_KEY overrides
 * it for a key rotation without a code change.
 */
const HOST = process.env.INDEXNOW_HOST || 'themodestyhouse.com';
const KEY = process.env.INDEXNOW_KEY || 'e6157f9adb3540d189cd0b9a92a08aa9';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;
const DRY = process.argv.includes('--dry');
const UA = { 'user-agent': 'themodestyhouse-indexnow/2.0' };

const fail = (msg) => {
  console.error(`IndexNow: ${msg}`);
  process.exit(1);
};

/* ------------------------------------------------------------------ *
 * 1. Preflight: is the key file actually live, and does it hold THIS key?
 * ------------------------------------------------------------------ *
 * Skipping this is how an IndexNow setup fails silently. A key file that is
 * missing, stale, or holds a different key produces HTTP 403 ("key invalid or
 * not found in file") — or, worse, 202 "validation pending" that never
 * resolves, which reads as success in every log. Checking first turns the most
 * common misconfiguration into one legible line.
 *
 * It also guards the specific case this repo will hit: a key rotation ships in
 * the same commit as the workflow, so the first automated run happens while
 * the new key file may not have deployed yet.
 */
const keyRes = await fetch(KEY_LOCATION, { headers: UA }).catch((e) => {
  fail(`could not fetch the key file ${KEY_LOCATION} — ${e.message}`);
});
if (!keyRes.ok) {
  fail(
    `key file ${KEY_LOCATION} returned HTTP ${keyRes.status}. ` +
      `It must be live BEFORE submitting, or the endpoint answers 403. ` +
      `Check public/${KEY}.txt is committed and deployed.`,
  );
}
const keyBody = (await keyRes.text()).trim();
if (keyBody !== KEY) {
  fail(`key file ${KEY_LOCATION} holds ${JSON.stringify(keyBody.slice(0, 64))}, expected ${JSON.stringify(KEY)}.`);
}
console.log(`IndexNow: key file verified at ${KEY_LOCATION}`);

/* ------------------------------------------------------------------ *
 * 2. URLs come from the DEPLOYED sitemap.xml, not a hardcoded list.
 * ------------------------------------------------------------------ *
 * They used to be hardcoded here, "duplicated rather than imported so this
 * script has zero dependency on the app's TS module graph". The dependency
 * argument was right; the duplication was not. By 2026-08-19 the list had
 * drifted to 12 of 14 lanes — missing /layering-basics and /outerwear, both of
 * which had been in sitemap.xml for days — and knew nothing about the 10 new
 * ?type= subtype pages. Exactly the failure public/llms.txt had, for exactly
 * the same reason.
 *
 * Reading the live sitemap keeps the zero-TS-dependency property (one fetch and
 * a regex) while making drift structurally impossible: app/sitemap.ts is
 * already generated from LANES + lib/laneSubtypes + getPosts(). It also submits
 * what is ACTUALLY deployed rather than what the local checkout believes, which
 * is the right thing to tell a crawler about.
 */
const xml = await fetch(SITEMAP, { headers: UA }).then((r) => {
  if (!r.ok) throw new Error(`sitemap fetch failed: HTTP ${r.status}`);
  return r.text();
});

const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

if (urlList.length === 0) {
  fail(`sitemap ${SITEMAP} returned no <loc> entries — refusing to submit an empty set.`);
}
// A URL from another host is rejected with 422 for the WHOLE batch, so catch it
// here where the message can name the offender.
const foreign = urlList.filter((u) => {
  try {
    return new URL(u).hostname !== HOST;
  } catch {
    return true;
  }
});
if (foreign.length) {
  fail(`sitemap contains ${foreign.length} URL(s) not on ${HOST}, e.g. ${foreign[0]} — the endpoint 422s the whole batch.`);
}
// 10,000 is the documented per-request maximum. This site is ~35 URLs; the
// check exists so that a future sitemap of product pages fails loudly here
// rather than being silently truncated by the endpoint.
if (urlList.length > 10000) {
  fail(`${urlList.length} URLs exceeds the 10,000-per-request limit — this script needs batching before it can submit that.`);
}

console.log(`IndexNow: ${urlList.length} URLs from ${SITEMAP}`);
for (const u of urlList) console.log(`  ${u}`);

if (DRY) {
  console.log('\n(--dry — nothing submitted)');
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * 3. Submit.
 * ------------------------------------------------------------------ *
 * api.indexnow.org fans the submission out to every participating engine, so
 * one POST covers Bing, Yandex, Naver and Seznam. Documented response codes:
 * 200 accepted · 202 accepted, key validation pending · 400 bad format ·
 * 403 key invalid or not found · 422 URL/host mismatch · 429 rate limited.
 */
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...UA },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

const body = await res.text().catch(() => '');
if (res.status === 200) {
  console.log(`IndexNow: accepted (HTTP 200) — ${urlList.length} URLs submitted.`);
} else if (res.status === 202) {
  // Not an error, but not a clean success either: the key file was verified
  // above, so a 202 here means the endpoint has not re-read it yet.
  console.log(`IndexNow: accepted, key validation pending (HTTP 202) — ${urlList.length} URLs submitted.`);
} else {
  fail(`HTTP ${res.status}${body ? ` — ${body.slice(0, 300)}` : ''}`);
}
