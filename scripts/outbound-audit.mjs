// npm run audit:outbound — end-to-end check of outbound-click tracking.
//
// Clicks a REAL outbound link on three surfaces in BOTH engines and asserts the
// event that would reach Pulse. Nothing static can see this: the listener is a
// useEffect and the event only exists after a click (§10.25).
//
// Pulse is production-only (app/layout.tsx gates on NODE_ENV), so locally
// `window.pulse` is absent and lib/pulse.ts takes its QUEUE path — which is
// exactly what makes this verifiable offline: click a real link, read
// window.pulseQueue, assert what WOULD have been sent.
//
// §10.28: asserts the page is interactive first, and every check reports a
// PROBLEM line rather than being silently absent.
import { chromium, webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3188';
const CASES = [
  { path: '/designers', surface: 'designers', garment: false },
  { path: '/modest-dresses', surface: 'quickview', garment: true, openCard: true },
  { path: '/', surface: null, garment: null },
];

let problems = 0;
const report = (name, engine, msg) => {
  if (msg.startsWith('PROBLEM')) problems++;
  console.log(`${name.padEnd(26)} ${engine.padEnd(9)} ${msg}`);
};

for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  const LOCAL = /^http:\/\/localhost:/.test(BASE);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, bypassCSP: LOCAL });
  // §10.24: over plain-http localhost WebKit honours HSTS and
  // upgrade-insecure-requests, rewrites every subresource to https, and renders
  // with NO CSS while still looking like a successful run. Chromium exempts
  // localhost. WebKit-only, because interception itself causes aborted image
  // requests that read as real defects (§10.26).
  if (LOCAL && engineName === 'webkit') {
    await ctx.route('**/*', async (route) => {
      if (!route.request().url().startsWith(BASE)) return route.abort();
      try {
        const res = await route.fetch();
        const headers = { ...res.headers() };
        delete headers['strict-transport-security'];
        if (headers['content-security-policy']) headers['content-security-policy'] = headers['content-security-policy'].replace('upgrade-insecure-requests', '');
        return route.fulfill({ response: res, headers });
      } catch { return route.abort(); }
    });
  }
  // Outbound links are target="_blank", so a click opens a brand's real site in
  // a NEW tab and leaves the page under test in place. Closing that tab is all
  // the isolation needed.
  //
  // An earlier version instead intercepted every request and aborted anything
  // off-origin. That is §10.26 #1 exactly: in Chromium the interception raced
  // and starved the page, and `/designers` and `/modest-dresses` reported
  // "listener never attached" on a site that was hydrating perfectly well —
  // a harness fault presenting as a product defect, in both directions
  // (WebKit passed the same routes). Interception is now used ONLY where it is
  // unavoidable: WebKit against plain-http localhost, above.
  // NB: must be `page.on('popup')`, not `ctx.on('page')` — the latter also fires
  // for the pages this script opens itself, and closed every one of them.

  for (const c of CASES) {
    const page = await ctx.newPage();
    page.on('popup', (pop) => { pop.close().catch(() => {}); });
    try {
      await page.goto(`${BASE}${c.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });

      // The stylesheet assertion (§10.24) — a page with no CSS measures nothing.
      const styled = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
      if (!styled) { report('stylesheet', engineName, `PROBLEM ${c.path}: CSS did not load`); continue; }

      // Interactivity assertion (§10.28 rule 2). NOT "does an outbound anchor
      // exist" — those are server-rendered and present long before hydration,
      // so waiting on them clicked too early and lost the first click on every
      // page. OutboundTracking sets this attribute from inside its effect, so
      // it is a claim by the listener itself that it is attached.
      const ready = await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => null);
      if (!ready) { report('hydration', engineName, `PROBLEM ${c.path}: listener never attached (page not interactive)`); continue; }

      if (c.openCard) {
        const card = page.locator('button[aria-label^="Quick view"]').first();
        await card.click({ timeout: 15000 });
        await page.waitForSelector('a[rel~="sponsored"][data-surface="quickview"]', { timeout: 15000 });
      }

      // With the quick-view modal open, `.first()` over every annotated anchor
      // picks a PRODUCT CARD's anchor — which is behind the modal overlay, so
      // the click is intercepted and times out 15s later. That has failed on
      // both engines since ProductCard's root became an <a> (2026-08-11); the
      // check has been reporting a harness fault as a product defect ever
      // since. Confirmed against pristine origin/main before fixing (§10.38
      // rule 1). When we opened the modal, the modal's link is the subject.
      const sel = c.openCard
        ? 'a[rel~="sponsored"][data-surface="quickview"]'
        : 'a[rel~="sponsored"][data-brand]';
      const link = page.locator(sel).first();
      const n = await page.locator(sel).count();
      if (n === 0) { report(`annotated-links${c.path}`, engineName, `PROBLEM ${c.path}: no annotated outbound link found`); continue; }

      // Capture BOTH delivery paths. lib/pulse.ts calls window.pulse.track()
      // when the script has initialised and only falls back to the queue when it
      // has not — so against production, where the script really loads, watching
      // the queue alone is a RACE. It passed or failed depending on whether the
      // click beat the script. Recording both makes the check deterministic in
      // either environment (§10.26: suspect the harness first).
      await page.evaluate(() => {
        window.pulseQueue = [];
        window.__seen = [];
        const prior = window.pulse && window.pulse.track;
        window.pulse = { track: (n, p) => { window.__seen.push(['track', n, p]); if (prior) try { prior(n, p); } catch {} } };
      });
      // Identify the exact anchor first, so a miss is diagnosable rather than
      // just "nothing happened".
      const chosen = await link.evaluate((a) => ({ brand: a.getAttribute('data-brand'), surface: a.getAttribute('data-surface'), href: a.getAttribute('href') }));

      // Every outbound link must carry the campaign tag. `rel="noreferrer"` on
      // these anchors strips the Referer header, so the UTM is the ONLY thing
      // that tells a brand's analytics the visit came from us (lib/outbound.ts).
      // The locator above is structural — rel~="sponsored" plus data-brand or
      // data-surface, all of which predate this check — so it cannot pass by
      // selecting on the very thing it is meant to prove (§10.32 rule 2). Reports and continues: an
      // untagged link is a real finding, but it must not mask the tracking
      // assertions below.
      if (!/[?&]utm_source=themodestyhouse\.com(?:&|$)/.test(chosen.href || '')) {
        report(`utm${c.path}`, engineName, `PROBLEM ${c.path}: outbound href carries no campaign tag — ${chosen.href}`);
      }
      await link.scrollIntoViewIfNeeded().catch(() => {});
      await link.click({ timeout: 15000, noWaitAfter: true });
      await page.waitForTimeout(300);

      const read = () => page.evaluate(() => [...(window.__seen || []), ...(window.pulseQueue || [])]);
      let queue = await read();
      let evt = queue.find((e) => e[0] === 'track' && e[1] === 'outbound_click');
      if (!evt) {
        // Retry ONCE. The homepage rail is a horizontally-scrolling carousel;
        // a click can land while it is still settling, and a single retry
        // distinguishes "flaky click" from "tracking is broken". A retry that
        // also fails is reported, never swallowed.
        await page.waitForTimeout(700);
        await link.click({ timeout: 15000, noWaitAfter: true }).catch(() => {});
        await page.waitForTimeout(400);
        queue = await read();
        evt = queue.find((e) => e[0] === 'track' && e[1] === 'outbound_click');
        if (evt) report(`retry ${c.path}`, engineName, `note: needed a second click on ${JSON.stringify(chosen)}`);
      }
      if (!evt) { report(`outbound${c.path}`, engineName, `PROBLEM ${c.path}: no outbound_click after 2 clicks on ${JSON.stringify(chosen)} (saw=${JSON.stringify(queue)})`); continue; }

      const props = evt[2] || {};
      const keys = Object.keys(props).sort().join(',');
      const allowed = ['brand', 'brand,garment,surface', 'brand,surface'];
      if (!allowed.includes(keys)) { report(`props${c.path}`, engineName, `PROBLEM ${c.path}: unexpected props ${JSON.stringify(props)}`); continue; }
      if (c.surface && props.surface !== c.surface) { report(`surface${c.path}`, engineName, `PROBLEM ${c.path}: surface=${props.surface} want ${c.surface}`); continue; }
      if (JSON.stringify(props).match(/http|@|\?/)) { report(`pii${c.path}`, engineName, `PROBLEM ${c.path}: url-ish value in ${JSON.stringify(props)}`); continue; }

      report(`outbound ${c.path}`, engineName, `ok ${JSON.stringify(props)}`);

      // PERMANENT NEGATIVE CONTROL (§10.28 rule 1). An INTERNAL link must emit
      // nothing. Without it, a recorder that fired on every click — or a
      // selector that matched every anchor — would still read as a clean pass,
      // which is the exact failure this repo has hit twice in its own harnesses.
      await page.evaluate(() => { window.__seen = []; window.pulseQueue = []; });
      const internal = page.locator('a[href^="/"]:not([rel~="sponsored"])').first();
      if (await internal.count()) {
        await internal.click({ timeout: 15000, noWaitAfter: true }).catch(() => {});
        await page.waitForTimeout(200);
        const after = await page.evaluate(() => [...(window.__seen || []), ...(window.pulseQueue || [])]);
        const leaked = after.some((e) => e.includes('outbound_click'));
        report(`negative ${c.path}`, engineName,
          leaked ? 'PROBLEM internal link emitted outbound_click' : 'ok internal link emitted nothing');
      } else {
        report(`negative ${c.path}`, engineName, 'PROBLEM no internal link found to test against');
      }
    } catch (e) {
      report(`case ${c.path}`, engineName, `PROBLEM threw: ${String(e).slice(0, 120)}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

console.log(`\n${problems === 0 ? 'ALL PASS' : `${problems} PROBLEM(S)`}`);
process.exit(problems === 0 ? 0 : 1);
