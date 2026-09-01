// npm run audit:outbound — end-to-end check of the site's Pulse GOALS.
//
// Named for the first one it covered. It now drives FIFTEEN of the seventeen
// goals in lib/pulse.ts: outbound_click, favourite_add, quick_view_open,
// share_link_copy, filter_apply, currency_change, search_zero_results and
// faq_open. Kept in one script rather than forked because the harness below —
// engine loop, WebKit header stripping, stylesheet and interactivity
// assertions — is the expensive part and is identical for all of them.
//
// THE TWO IT DOES NOT DRIVE, said out loud so the gap is not silent (§10.28
// rule 3): `newsletter_signup` and `contact_submit` fire only after their API
// accepts a submission, so exercising them here would email Tina a fake
// sign-up and a fake enquiry on every run, and the contact form additionally
// needs a real Turnstile token. They are covered by lib/pulse.test.ts at the
// unit level, where the assertion that matters — that neither can carry an
// address, a name or a message — actually lives.
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
  // clipboard-write so the quick-view "Copy share link" can actually succeed in
  // Chromium — the component only emits share_link_copy on a SUCCESSFUL copy,
  // so without this the check reports a permissions prompt as a site defect.
  // WebKit does not know the permission name (and allows the write anyway), so
  // it is Chromium-only; passing it there throws.
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    bypassCSP: LOCAL,
    ...(engineName === 'chromium' ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}),
  });
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

  // ── favourite_add ────────────────────────────────────────────────────────
  // The saved-piece goal. Unlike the outbound event this one is emitted from
  // React state (QuickViewProvider.toggleFav), not from a delegated listener,
  // and it must fire on a SAVE and stay silent on a removal — neither of which
  // any static render or unit test can see.
  {
    const page = await ctx.newPage();
    try {
      // Favourites persist in localStorage and this context is reused, so a
      // leftover save would make the first heart a REMOVAL and the check would
      // read as "no event" on code that works. Cleared before the page's own
      // scripts run.
      await page.addInitScript(() => { try { localStorage.removeItem('tmh_favs'); } catch {} });
      await page.goto(`${BASE}/modest-dresses`, { waitUntil: 'domcontentloaded', timeout: 45000 });

      const styled = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
      if (!styled) { report('fav stylesheet', engineName, 'PROBLEM /modest-dresses: CSS did not load'); throw new Error('skip'); }
      const ready = await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => null);
      if (!ready) { report('fav hydration', engineName, 'PROBLEM /modest-dresses: page not interactive'); throw new Error('skip'); }

      const recorder = () => page.evaluate(() => {
        window.pulseQueue = [];
        window.__seen = [];
        const prior = window.pulse && window.pulse.track;
        window.pulse = { track: (n, p) => { window.__seen.push(['track', n, p]); if (prior) try { prior(n, p); } catch {} } };
      });
      const read = () => page.evaluate(() => [...(window.__seen || []), ...(window.pulseQueue || [])]);
      const favEvent = (q) => q.find((e) => e[0] === 'track' && e[1] === 'favourite_add');
      const ALLOWED = ['brand,garment,product,title'];

      // The heart is located by its aria-label and the SAVE is confirmed by
      // that label flipping — both predate this event, so the check cannot
      // pass by selecting on the thing it is meant to prove (§10.32 rule 2).
      // The flip is also the interactivity assertion for this widget
      // specifically: it is React state, so a label that changes proves the
      // provider is live (§10.28 rule 2).
      await recorder();
      // An elementHandle, NOT a locator. A locator re-resolves on every use, and
      // the click flips this heart's aria-label — so `.first()` afterwards
      // pointed at the NEXT card's heart, which read as "the heart did not
      // become saved" and then made the removal control save a second product
      // instead. Both looked exactly like product defects (§10.26). React
      // updates the attribute in place, so the node itself is stable.
      await page.locator('button[aria-label="Add to favourites"]').first().scrollIntoViewIfNeeded().catch(() => {});
      const heart = await page.locator('button[aria-label="Add to favourites"]').first().elementHandle();
      if (!heart) { report('fav heart', engineName, 'PROBLEM /modest-dresses: no unsaved heart found'); throw new Error('skip'); }
      await heart.click({ timeout: 15000 });
      const flipped = await heart.getAttribute('aria-label').catch(() => null);
      if (flipped !== 'Remove from favourites') {
        report('fav state', engineName, `PROBLEM heart did not become saved (aria-label=${flipped})`);
      }
      await page.waitForTimeout(300);
      const saved = favEvent(await read());
      if (!saved) {
        report('favourite card', engineName, `PROBLEM no favourite_add after saving a piece (saw=${JSON.stringify(await read()).slice(0, 200)})`);
      } else {
        const props = saved[2] || {};
        const keys = Object.keys(props).sort().join(',');
        if (!ALLOWED.includes(keys)) report('favourite props', engineName, `PROBLEM unexpected props ${JSON.stringify(props)}`);
        // Invariant 1: the id that joins this back to data/products.json.
        else if (!/^[a-z0-9-]+:[^:]+$/.test(props.product || '')) report('favourite props', engineName, `PROBLEM product is not a catalogue id: ${JSON.stringify(props)}`);
        else if (JSON.stringify(props).match(/https?:|utm_/)) report('favourite pii', engineName, `PROBLEM url-ish value in ${JSON.stringify(props)}`);
        else report('favourite card', engineName, `ok ${JSON.stringify(props)}`);
      }

      // NEGATIVE CONTROL (§10.28 rule 1). Un-saving the same piece must emit
      // NOTHING. A toggle that tracked both directions would still read as a
      // clean pass above, and would report "most loved" numbers that were half
      // people changing their minds.
      await recorder();
      await heart.click({ timeout: 15000 });
      await page.waitForTimeout(300);
      const onRemove = favEvent(await read());
      report('negative unfavourite', engineName,
        onRemove ? `PROBLEM removal emitted ${JSON.stringify(onRemove[2])}` : 'ok removing a piece emitted nothing');

      // Second surface: the quick-view modal's own save button, which is a
      // different call site into the same provider. nth(1) so the product is a
      // different one from the card above.
      await recorder();
      await page.locator('button[aria-label^="Quick view"]').nth(1).click({ timeout: 15000 });
      const chip = page.locator('[role="dialog"] button:has-text("Add to favourites")');
      await chip.waitFor({ timeout: 15000 });
      await chip.click({ timeout: 15000 });
      await page.waitForTimeout(300);
      const fromModal = favEvent(await read());
      if (!fromModal) report('favourite quickview', engineName, 'PROBLEM no favourite_add from the quick-view save button');
      else if (Object.keys(fromModal[2] || {}).sort().join(',') !== ALLOWED[0]) report('favourite quickview', engineName, `PROBLEM unexpected props ${JSON.stringify(fromModal[2])}`);
      else report('favourite quickview', engineName, `ok ${JSON.stringify(fromModal[2])}`);
    } catch (e) {
      if (String(e).includes('skip')) { /* already reported */ }
      else report('favourite case', engineName, `PROBLEM threw: ${String(e).slice(0, 140)}`);
    } finally {
      await page.close();
    }
  }

  // ── the remaining goals ──────────────────────────────────────────────────
  {
    const page = await ctx.newPage();
    page.on('popup', (pop) => { pop.close().catch(() => {}); });
    const recorder = () => page.evaluate(() => {
      window.pulseQueue = [];
      window.__seen = [];
      const prior = window.pulse && window.pulse.track;
      window.pulse = { track: (n, p) => { window.__seen.push(['track', n, p]); if (prior) try { prior(n, p); } catch {} } };
    });
    const read = () => page.evaluate(() => [...(window.__seen || []), ...(window.pulseQueue || [])]);
    const find = async (name) => (await read()).find((e) => e[0] === 'track' && e[1] === name);
    const check = async (name, label, want) => {
      const evt = await find(name);
      if (!evt) return report(label, engineName, `PROBLEM no ${name} emitted`);
      const props = evt[2] || {};
      for (const [k, v] of Object.entries(want || {})) {
        if (v instanceof RegExp ? !v.test(props[k] || '') : props[k] !== v) {
          return report(label, engineName, `PROBLEM ${name}.${k}=${props[k]} want ${v}`);
        }
      }
      return report(label, engineName, `ok ${JSON.stringify(props)}`);
    };

    try {
      await page.goto(`${BASE}/modest-hijabs`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const styled = await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
      if (!styled) { report('goals stylesheet', engineName, 'PROBLEM /modest-hijabs: CSS did not load'); throw new Error('skip'); }
      if (!(await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => null))) {
        report('goals hydration', engineName, 'PROBLEM /modest-hijabs: page not interactive'); throw new Error('skip');
      }

      // filter_apply — driven through the Sort chip, which every grid has and
      // which needs no lane-specific knowledge. The menu is a real Base UI
      // primitive (§10.25), so this is a tap on the chip then a tap on a row.
      await recorder();
      await page.getByRole('button', { name: 'Sort', exact: true }).click({ timeout: 15000 });
      await page.getByRole('menuitemradio', { name: /Newest/i }).first().click({ timeout: 15000 });
      await page.waitForTimeout(300);
      await check('filter_apply', 'filter_apply sort', { filter: 'sort', lane: '/modest-hijabs' });

      // search_zero_results — on /new-in, which is the ONLY grid with a
      // search field: every lane passes searchable={false}. Found the hard way
      // — this check first ran on /modest-hijabs and timed out on a control
      // that has never existed there (§10.38: the harness, not the site).
      await page.goto(`${BASE}/new-in`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => {});
      await recorder();
      const field = page.getByLabel('Search houses and pieces').first();
      await field.click({ timeout: 15000 });
      await field.fill('zzzqqxnothinghere');
      await page.waitForTimeout(2000);
      await check('search_zero_results', 'search_zero_results', { query: 'zzzqqxnothinghere' });

      // NEGATIVE CONTROL: a search that FINDS something must stay silent. The
      // policy promises exactly that, and a hook that reported every settled
      // query would still pass the positive check above.
      await recorder();
      await field.fill('hijab');
      await page.waitForTimeout(2000);
      const leaked = await find('search_zero_results');
      report('negative search-hit', engineName,
        leaked ? `PROBLEM a search WITH results emitted ${JSON.stringify(leaked[2])}` : 'ok a search with results emitted nothing');
      await field.fill('');

      // currency_change — the header switcher. Its trigger names the current
      // currency, so this also proves the switch happened.
      await recorder();
      await page.getByRole('button', { name: /Change currency/i }).first().click({ timeout: 15000 });
      await page.getByRole('menuitem', { name: /EUR/i }).first().click({ timeout: 15000 });
      await page.waitForTimeout(300);
      await check('currency_change', 'currency_change', { currency: 'EUR', from: 'USD' });

      // quick_view_open + share_link_copy, in the modal.
      await recorder();
      await page.locator('button[aria-label^="Quick view"]').first().click({ timeout: 15000 });
      await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
      await check('quick_view_open', 'quick_view_open', { product: /^[a-z0-9-]+:/ });

      await recorder();
      await page.locator('[role="dialog"] button:has-text("Copy share link")').click({ timeout: 15000 });
      await page.waitForTimeout(400);
      // The clipboard write can be refused by the browser (no permission, no
      // user-activation heuristics headless). The component only tracks on a
      // SUCCESSFUL copy, so read the button's own state first and say which
      // case this is, rather than reporting a permission problem as a defect.
      const copied = await page.locator('[role="dialog"] button:has-text("Link copied")').count();
      if (!copied) report('share_link_copy', engineName, 'PROBLEM clipboard write did not succeed, so the goal could not fire (harness, not site)');
      else await check('share_link_copy', 'share_link_copy', { product: /^[a-z0-9-]+:/ });

      // faq_open — a different page, and the one goal on a timer.
      await page.goto(`${BASE}/faq`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => {});
      await recorder();
      // Scoped to the accordion's own heading. A bare button[aria-expanded]
      // matched the header's hidden phone-nav trigger first — 19 elements on the
      // page carry the attribute — and Playwright waited 15s for something that
      // is display:none above the hdr breakpoint. Structural, and it predates
      // this change (HowBlocks wraps each trigger in its heading), so the check
      // cannot pass by selecting on anything the goal introduced (§10.32 r2).
      const q = page.locator('h2 button[aria-expanded]').first();
      // HOVER, not click. These blocks open on pointerenter for a mouse, so
      // Playwright's click sequence opens the block on the way in and then
      // TOGGLES IT SHUT — which is documented in HowBlocks.tsx and is exactly
      // why the goal is fired from the open state rather than from onClick.
      // Clicking here reported "no faq_open emitted" on a component that works;
      // the harness was performing the one gesture that closes it again.
      await q.hover({ timeout: 15000 });
      await page.waitForTimeout(1500);
      await check('faq_open', 'faq_open', { question: /\S/ });
    } catch (e) {
      if (!String(e).includes('skip')) report('goals case', engineName, `PROBLEM threw: ${String(e).slice(0, 140)}`);
    } finally {
      await page.close();
    }
  }

  // ── the engagement goals ─────────────────────────────────────────────────
  {
    const page = await ctx.newPage();
    page.on('popup', (pop) => { pop.close().catch(() => {}); });
    // A sub-category link NAVIGATES, which would tear the page down before the
    // queue could be read. lib/pulse.ts records it from a CAPTURE-phase
    // listener, so a bubble-phase preventDefault here runs strictly after it:
    // the goal is emitted exactly as it is in production, and only the
    // navigation is suppressed. The site is untouched.
    await page.addInitScript(() => {
      document.addEventListener('click', (e) => {
        const a = e.target instanceof Element ? e.target.closest('a[href*="?type="]') : null;
        if (a) e.preventDefault();
      }, false);
    });
    const recorder = () => page.evaluate(() => {
      window.pulseQueue = [];
      window.__seen = [];
      const prior = window.pulse && window.pulse.track;
      window.pulse = { track: (n, p) => { window.__seen.push(['track', n, p]); if (prior) try { prior(n, p); } catch {} } };
    });
    const read = () => page.evaluate(() => [...(window.__seen || []), ...(window.pulseQueue || [])]);
    const check = async (name, want) => {
      const evt = (await read()).find((e) => e[0] === 'track' && e[1] === name);
      if (!evt) return report(name, engineName, `PROBLEM no ${name} emitted`);
      const props = evt[2] || {};
      for (const [k, v] of Object.entries(want || {})) {
        if (v instanceof RegExp ? !v.test(props[k] || '') : props[k] !== v) {
          return report(name, engineName, `PROBLEM ${name}.${k}=${props[k]} want ${v}`);
        }
      }
      return report(name, engineName, `ok ${JSON.stringify(props)}`);
    };

    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (!(await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => null))) {
        report('engagement hydration', engineName, 'PROBLEM /: page not interactive'); throw new Error('skip');
      }

      // rail_scroll — the homepage carousel's own arrow.
      await recorder();
      await page.locator('button[aria-label="Scroll right"]').first().click({ timeout: 15000 });
      await page.waitForTimeout(300);
      await check('rail_scroll', { direction: 'right', rail: /\S/ });

      // region_filter — the designers map. Opening only; closing is not a goal.
      await recorder();
      // /^Europe/, not /^Europe\d*$/: the row's accessible name joins the region
      // and its count with a space ("Europe 58"), so the anchored form matched
      // nothing and read as a dead control (§10.26).
      await page.getByRole('button', { name: /^Europe/ }).first().click({ timeout: 15000 });
      await page.waitForTimeout(300);
      await check('region_filter', { region: /Europe/ });

      // nav_open — the desktop header group. HOVER, because that is what opens
      // it on a mouse; the tap path goes through the same openNav().
      await recorder();
      await page.getByRole('navigation').getByText('Clothing', { exact: true }).first().hover({ timeout: 15000 });
      await page.waitForTimeout(600);
      await check('nav_open', { group: 'Clothing' });

      // subtype_click — a footer/nav ?type= link, with navigation suppressed
      // by the init script above.
      // The ?type= links live ONLY in the header's wide nav panels — all four
      // of which are mounted at once and cross-fade on opacity (NavMenu.tsx),
      // so every one of them reports a non-empty box to Playwright while three
      // are unclickable. `.first()` therefore waited 15s on a hidden row, and
      // `footer a[href*="?type="]` matched nothing at all: they are not in the
      // footer. Open the panel that owns them, then click one, which is also
      // the only route a real visitor has.
      await recorder();
      await page.getByRole('navigation').getByText('Hijabs', { exact: true }).first().hover({ timeout: 15000 });
      await page.waitForTimeout(500);
      await page.locator('a[href="/modest-hijabs?type=undercap"]').first().click({ timeout: 15000 });
      await page.waitForTimeout(300);
      await check('subtype_click', { lane: /^\//, value: /\S/ });

      // load_more + image_zoom, on the biggest grid.
      await page.goto(`${BASE}/new-in`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => {});
      await recorder();
      const more = page.getByRole('button', { name: 'Load more' });
      await more.scrollIntoViewIfNeeded().catch(() => {});
      await more.click({ timeout: 15000 });
      await page.waitForTimeout(300);
      // 48 = STEP * 2, i.e. the count AFTER the first tap. A depth that reported
      // the count BEFORE would make every "how deep do people go" answer wrong
      // by one screen.
      await check('load_more', { lane: '/new-in', depth: '48' });

      await recorder();
      await page.locator('button[aria-label^="Quick view"]').first().click({ timeout: 15000 });
      await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
      await page.locator('[role="dialog"] img').first().click({ timeout: 15000 });
      await page.waitForTimeout(300);
      await check('image_zoom', { product: /^[a-z0-9-]+:/ });

      // about_step_open — the same component as faq_open, opted in separately.
      await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('html[data-outbound-ready]', { timeout: 25000 }).catch(() => {});
      await recorder();
      await page.locator('h3 button[aria-expanded]').first().hover({ timeout: 15000 });
      await page.waitForTimeout(1500);
      await check('about_step_open', { question: /\S/ });
    } catch (e) {
      if (!String(e).includes('skip')) report('engagement case', engineName, `PROBLEM threw: ${String(e).slice(0, 140)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

console.log(`\n${problems === 0 ? 'ALL PASS' : `${problems} PROBLEM(S)`}`);
process.exit(problems === 0 ? 0 : 1);
