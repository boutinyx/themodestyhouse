// Interaction-state audit: the parts of the site that only exist AFTER a tap.
//
// The page-level audit (scripts/visual-audit.mjs) renders every route as it
// arrives. That is blind to the phone menu, the filter dropdowns, quick view,
// the currency picker, the search suggestions and the favourites page with
// something in it — i.e. most of the actual interface. This drives each of them
// and measures the result at phone / tablet / desktop in both engines.
//
//   node scripts/interaction-audit.mjs
//   ENGINE=webkit node scripts/interaction-audit.mjs
import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3177';
const LOCAL = /^http:\/\/localhost:/.test(BASE);
const OUT = new URL('../.audit/interaction/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  'mobile-390': { width: 390, height: 844, touch: true },
  'tablet-819': { width: 819, height: 1180, touch: true },
  // iPad landscape. The one combination the other three miss: TOUCH at
  // >=1024px, i.e. a device that gets the full desktop header — including the
  // currency switcher, which lives in `hidden lg:flex` — while having no hover
  // at all. That is precisely the blind spot behind CLAUDE.md §10.25, where
  // hover-only filter dropdowns were unreachable on every Apple device.
  // tablet-819 does not cover it: below 1024 the desktop header is not there.
  // iPad 9.7"/10.2" LANDSCAPE. Added 2026-08-27 with the header's own
  // breakpoint (`--breakpoint-hdr`, 1152px): this width used to get the
  // desktop header and could not fit it — the row overflowed by 120px, taking
  // search, favourites and the currency switcher off the right edge — and now
  // gets the phone drawer instead. It is the only viewport here that exercises
  // the drawer at a TABLET width, which is a different case from tablet-819:
  // above `md`, so the drawer's own `md`-gated rules apply, on a real
  // landscape aspect.
  'ipad-1024': { width: 1024, height: 768, touch: true },
  'ipad-1366': { width: 1366, height: 1024, touch: true },
  'desktop-1440': { width: 1440, height: 900, touch: false },
};
const ENGINES = { chromium, webkit };
const engineNames = process.env.ENGINE ? [process.env.ENGINE] : Object.keys(ENGINES);

const report = [];
const note = (o) => { report.push(o); };

/** The stylesheet must have loaded, or every measurement below is a measurement
 *  of an unstyled document — which still looks like a successful run in the log.
 *  This is CLAUDE.md §10.24: over plain-http localhost WebKit honours HSTS and
 *  upgrade-insecure-requests and silently drops every subresource. The first
 *  version of this file had no such check, and a whole WebKit desktop pass was
 *  reported as horizontal overflow, a missing modal and a 1372px-wide dropdown
 *  — all of them artefacts of a page with no CSS at all. */
const CSS_OK = `(() => {
  const cs = getComputedStyle(document.body);
  return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && /Jost|Bodoni|Marcellus/i.test(cs.fontFamily);
})()`;

/** Every box that is visible and carries its own text, so an overlap or an
 *  off-screen control can be found in a state that has no URL. */
const PROBE = () => {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const ident = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + (el.className || '').toString().replace(/\s+/g, '.').slice(0, 50) : ''}`;
  const out = { vw, vh, offscreen: [], clippedControls: [], overflowX: document.documentElement.scrollWidth > vw + 1 };
  // A control that has been pushed outside the viewport, or clipped away by an
  // `overflow:hidden` ancestor, cannot be used at all — and nothing in a
  // static render can see it, because the state does not exist until a tap.
  // A control inside a horizontal scroll rail is SUPPOSED to be off-screen —
  // that is what a rail is — and the honeypot inputs are parked at -9999px on
  // purpose. Reporting either drowns the real findings: the first run of this
  // file returned eight "OFFSCREEN" editor's-pick cards on every single row.
  const inRail = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll('a[href],button,input,select,[role="button"],[role="menuitem"]')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.getAttribute('tabindex') === '-1' || el.closest('[aria-hidden="true"]')) continue;
    // Base UI parks a pair of 1x1 `role="button"` focus guards at (-1,-1),
    // `position:fixed` and `clip`ped to nothing, around every open popup. They
    // are not controls and are not visible, but they are tabbable — so they
    // pass every test above and were reported as two CLIPPED controls on each
    // WebKit run the moment a check opened a portalled menu. §10.26: a whole
    // category failing at once, in one engine only, is the harness.
    if (el.hasAttribute('data-base-ui-focus-guard')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (inRail(el)) continue;
    if (r.right > vw + 2 || r.left < -2) {
      out.offscreen.push({ sel: ident(el), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28), left: Math.round(r.left), right: Math.round(r.right), vw });
    }
    // Inside a clipping ancestor and outside its box.
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pc = getComputedStyle(p);
      if (pc.overflow === 'hidden' || pc.overflowY === 'hidden') {
        const pr = p.getBoundingClientRect();
        if (r.bottom > pr.bottom + 2 || r.top < pr.top - 2) {
          out.clippedControls.push({ sel: ident(el), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28), by: ident(p), elBottom: Math.round(r.bottom), boxBottom: Math.round(pr.bottom) });
        }
        break;
      }
      p = p.parentElement;
    }
  }
  out.offscreen = out.offscreen.slice(0, 8);
  out.clippedControls = out.clippedControls.slice(0, 8);
  return out;
};

for (const engineName of engineNames) {
  const browser = await ENGINES[engineName].launch();

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      hasTouch: vp.touch,
      isMobile: engineName === 'chromium' ? vp.touch : undefined,
      bypassCSP: LOCAL,
    });
    // WebKit only — see the note on the same block in scripts/visual-audit.mjs.
    // Chromium exempts localhost from HSTS, and routing its requests through
    // route.fetch() only introduces aborts that read as broken images.
    if (LOCAL && engineName === 'webkit') {
      await context.route('**/*', async (r) => {
        const url = r.request().url().replace(/^https:\/\/localhost:/, 'http://localhost:');
        try {
          const res = await r.fetch({ url });
          const headers = { ...res.headers() };
          delete headers['strict-transport-security'];
          if (headers['content-security-policy']) headers['content-security-policy'] = headers['content-security-policy'].replace('upgrade-insecure-requests', '');
          await r.fulfill({ response: res, headers });
        } catch { try { await r.abort(); } catch {} }
      });
    }
    const page = await context.newPage();
    const tag = `${vpName}__${engineName}`;
    const shot = async (name) => {
      await page.screenshot({ path: new URL(`${name}__${tag}.png`, OUT).pathname, fullPage: false });
    };
    const go = async (path) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      // Retry ONCE if the stylesheet is missing, then give up loudly. A silent
      // no-CSS render is the failure mode that makes this whole file lie.
      if (!(await page.evaluate(CSS_OK))) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        if (!(await page.evaluate(CSS_OK))) {
          throw new Error(`NO CSS on ${path} — every measurement here would be meaningless`);
        }
      }
    };

    // ---- 1. phone menu ---------------------------------------------------
    try {
      await go('/');
      const trigger = page.locator('[aria-label="Open navigation"]');
      if (await trigger.isVisible()) {
        await trigger.click();
        await page.waitForTimeout(500);
        await shot('menu-open');
        const probe = await page.evaluate(PROBE);
        // The panel scrolls; the question is whether the LAST row can be
        // reached, which is a different question from whether it fits.
        const reach = await page.evaluate(() => {
          const nav = document.querySelector('[role="dialog"] nav, [data-base-ui-popup] nav');
          if (!nav) return { found: false };
          nav.scrollTop = nav.scrollHeight;
          const last = nav.lastElementChild?.getBoundingClientRect();
          return { found: true, scrollable: nav.scrollHeight > nav.clientHeight, lastBottom: Math.round(last?.bottom ?? 0), vh: window.innerHeight };
        });
        note({ engine: engineName, viewport: vpName, state: 'mobile-menu-open', ...probe, reach });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        note({ engine: engineName, viewport: vpName, state: 'mobile-menu-open', skipped: 'trigger hidden at this width (expected above md)' });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'mobile-menu-open', error: e.message.split('\n')[0] }); }

    // ---- 2. desktop nav dropdown ----------------------------------------
    //
    // DEAD FROM 2026-08-09 TO 2026-08-10, and worth reading before trusting any
    // other check here. The locator was `getByRole('button', {name: /styles/i})`
    // — the "Styles" group, deleted with the /style/[vibe] pages on 2026-08-09.
    // Nothing has matched it since, so this logged "desktop nav hidden at this
    // width" at EVERY width in BOTH engines, including 1440 where the nav is
    // plainly visible and open-able by hand. §10.28: a check that skips every
    // run is a check you do not have — and this is the one that should have
    // caught the panel's rows rendering centred.
    //
    // "Clothing" is a LINK, not a button (the group carries an href to
    // /directory), which is why it is matched by text; and it opens on hover
    // with a mouse, on tap without one.
    //
    // It was "Products" until 2026-08-22 — the trigger was RENAMED to
    // "Clothing" on 2026-08-21 and this check went straight back to reporting
    // `skipped (desktop nav hidden at this width)` at desktop-1440, where the
    // nav is plainly visible. That is the third time this exact check has
    // died to a rename (§10.29, §10.32) and the second time the skip message
    // has asserted something false about the page. Measured before repairing:
    // `header Products text count 0`, actual labels
    // ['Clothing','Hijabs','Basics','Designers','Editorial','About'].
    try {
      await go('/directory');
      const products = page.locator('header').getByText('Clothing', { exact: true }).first();
      if (await products.isVisible().catch(() => false)) {
        if (vp.touch) await products.tap(); else await products.hover();
        await page.waitForTimeout(600);
        const panel = await page.evaluate(() => {
          // Found STRUCTURALLY — an absolutely-positioned, currently-VISIBLE
          // block holding four or more links — not by any class the fix
          // introduced. A check keyed to the class of its own fix reports
          // "panel did not open" the moment that class changes, i.e. it fails
          // for a reason that has nothing to do with what it tests (§10.29,
          // §10.32 rule 2 — both learned in this very file).
          //
          // It used to look for a `<nav>` PORTALLED OUTSIDE the header, which
          // was right until 2026-08-21: the wide panel stopped being Base UI's
          // floating Popup that day and became a plain absolutely-positioned
          // sibling INSIDE the header row (Tina: "its a extention of the WHOLE
          // header"). Combined with the "Products" -> "Clothing" rename, that
          // is two independent reasons this check could not have run since.
          // The visibility clauses matter: all three wide panels exist in the
          // DOM at once and only the open one has height. Verified as a
          // negative control 2026-08-22 — closed nav finds 0 panels, Clothing
          // open finds exactly 1 with 12 links, Hijabs open finds 1 with 4.
          const popup = [...document.querySelectorAll('header div, body > div')].find((d) => {
            const cs = getComputedStyle(d);
            return (
              cs.position === 'absolute' &&
              cs.visibility !== 'hidden' &&
              cs.opacity !== '0' &&
              d.getBoundingClientRect().height > 0 &&
              d.querySelectorAll('a[href]').length >= 4
            );
          });
          const rows = popup ? [...popup.querySelectorAll('a[href]')] : [];
          if (!rows.length) return { PROBLEM: 'NAV PANEL DID NOT OPEN' };
          // A column is a set of rows sharing a box left edge. Within one, every
          // row must start its TEXT at the same x. Measuring the text and not
          // the box is the whole point: the box is stretched to the column by
          // the grid either way, so a centred row and a left-aligned row have
          // identical boxes and differ only in where the glyphs land.
          const cols = {};
          for (const a of rows) {
            const box = a.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(a);
            (cols[Math.round(box.left)] ||= []).push(Math.round(range.getBoundingClientRect().left));
          }
          const ragged = Object.entries(cols).filter(([, xs]) => new Set(xs).size > 1);
          return {
            navRows: rows.length,
            navColumns: Object.keys(cols).length,
            ...(ragged.length ? { PROBLEM: `NAV ROWS NOT LEFT-ALIGNED — text starts at ${JSON.stringify(ragged)}` } : {}),
          };
        });
        await shot('nav-products-open');
        note({ engine: engineName, viewport: vpName, state: 'nav-dropdown-open', ...(await page.evaluate(PROBE)), ...panel });
      } else {
        note({ engine: engineName, viewport: vpName, state: 'nav-dropdown-open', skipped: 'desktop nav hidden at this width' });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'nav-dropdown-open', error: e.message.split('\n')[0] }); }

    // ---- 2b. the same nav, on a tablet whose browser CLAIMS it can hover --
    // THE question this exists to answer: does the header menu open for a
    // FINGER on a device that answers `(hover: none)` with FALSE?
    //
    // Check 2 above cannot ask it. Playwright's `hasTouch` contexts report
    // `hover: none`, so 2 only ever exercises the branch that already worked.
    // A tablet with a paired trackpad or keyboard — and every touchscreen
    // laptop — reports `hover: hover` while the gesture is still a finger,
    // and until 2026-08-27 that combination got no touch branch at all:
    // Clothing/Hijabs/Basics absorbed the tap and navigated away instead of
    // opening, and Active (a button, with nowhere to navigate) did nothing
    // whatsoever. Reproduced against production in both engines before the
    // fix; the fix reads the gesture's own `pointerType` instead of the
    // media query. CLAUDE.md §10.45 is the entry this extends — its rule 2
    // named `(hover: none)` as the honest discriminator, which it is about
    // the DEVICE and is not about the GESTURE.
    //
    // Its own context, because the stub must be in place before first paint
    // and the other checks in this file depend on the real media query.
    if (vp.touch) {
      let ctx2;
      try {
        ctx2 = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          hasTouch: true,
          isMobile: engineName === 'chromium',
          bypassCSP: LOCAL,
        });
        // Only `(hover: none)` is stubbed. Everything else — real touch
        // hardware, real viewport — is left exactly as the device reports it.
        await ctx2.addInitScript(`(() => {
          const orig = window.matchMedia.bind(window);
          window.matchMedia = (q) => /hover:\\s*none/.test(q)
            ? { matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {},
                addListener() {}, removeListener() {}, dispatchEvent() { return false; } }
            : orig(q);
        })();`);
        if (LOCAL && engineName === 'webkit') {
          await ctx2.route('**/*', async (r) => {
            const url = r.request().url().replace(/^https:\/\/localhost:/, 'http://localhost:');
            try {
              const res = await r.fetch({ url });
              const headers = { ...res.headers() };
              delete headers['strict-transport-security'];
              if (headers['content-security-policy']) headers['content-security-policy'] = headers['content-security-policy'].replace('upgrade-insecure-requests', '');
              await r.fulfill({ response: res, headers });
            } catch { try { await r.abort(); } catch {} }
          });
        }
        const page2 = await ctx2.newPage();
        await page2.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page2.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        if (!(await page2.evaluate(CSS_OK))) throw new Error('NO CSS — every measurement here would be meaningless');
        const lied = await page2.evaluate(() => window.matchMedia('(hover: none)').matches === false);
        if (!lied) throw new Error('the (hover: none) stub did not take — this check would prove nothing');
        // Every group, including "Active", the one trigger with no href: it
        // has no navigation to fall back on, so a broken tap there produces
        // no visible effect at all.
        const dead = [];
        for (const label of ['Clothing', 'Hijabs', 'Basics', 'Active']) {
          await page2.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page2.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          const trigger = page2.locator('header').getByText(label, { exact: true }).first();
          if (!(await trigger.isVisible().catch(() => false))) { dead.push(`${label}:absent`); continue; }
          await trigger.tap();
          await page2.waitForTimeout(600);
          // Structural, and NOT the marker the fix introduced: an open panel
          // is a visible absolutely-positioned block of links, the same shape
          // check 2 above looks for.
          const opened = await page2.evaluate(() => [...document.querySelectorAll('header div')].some((d) => {
            const cs = getComputedStyle(d);
            return cs.position === 'absolute' && cs.visibility !== 'hidden' && cs.opacity !== '0' &&
              d.getBoundingClientRect().height > 0 && d.querySelectorAll('a[href]').length >= 2;
          }));
          const path = new URL(page2.url()).pathname;
          if (!opened) dead.push(`${label}:${path === '/' ? 'nothing happened' : 'navigated to ' + path}`);
        }
        // Below 1024 the desktop header is not rendered at all (`hidden
        // lg:flex`) and the phone drawer is the nav — so all four absent is
        // the honest, expected state at mobile-390 and tablet-819, not a
        // failure. SOME absent while others are present would be a real
        // finding and still reports as one. Check 2 above skips the same two
        // viewports for the same reason, so a run where this line goes quiet
        // at ipad-1366 too is visible against that (§10.32 rule 3).
        const allAbsent = dead.length === 4 && dead.every((d) => d.endsWith(':absent'));
        note({
          engine: engineName, viewport: vpName, state: 'nav-tap-on-hover-capable-tablet',
          ...(allAbsent ? { skipped: 'desktop nav hidden at this width' }
            : dead.length ? { PROBLEM: `TRIGGERS DID NOT OPEN ON TAP — ${dead.join(', ')}` }
              : { groupsOpened: 4 }),
        });
      } catch (e) {
        note({ engine: engineName, viewport: vpName, state: 'nav-tap-on-hover-capable-tablet', error: e.message.split('\n')[0] });
      } finally { if (ctx2) await ctx2.close().catch(() => {}); }
    }

    // ---- 3. filter dropdown on /directory --------------------------------
    // THE question this exists to answer: the panel is revealed by
    // `group-hover` / `group-focus-within`. Neither is a tap. Safari famously
    // does not focus a <button> on click, and a touch device has no hover — so
    // whether these filters can be opened AT ALL on a phone is not something
    // source-reading can settle. Drive it and look.
    try {
      await go('/directory');
      const chip = page.locator('.chip').first();
      await chip.scrollIntoViewIfNeeded();
      await chip.click();
      await page.waitForTimeout(500);
      const opened = await page.evaluate(() => {
        // `.scroll-fade` — renamed from `.menu-scroll` on 2026-08-09 when the
        // fade was generalised. The rename silently broke this check: it found
        // nothing and reported "PANEL DID NOT OPEN ON TAP" at every viewport in
        // both engines, on a dropdown that opens perfectly well. A selector in
        // a script is a reference the compiler cannot see, so a class rename
        // must be grepped across scripts/ too, not just app/components/lib.
        const panels = [...document.querySelectorAll('.scroll-fade')];
        return panels.map((p) => {
          const r = p.getBoundingClientRect();
          const cs = getComputedStyle(p.parentElement);
          return { visible: cs.display !== 'none' && r.width > 0, w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), vw: document.documentElement.clientWidth };
        }).filter((p) => p.visible);
      });
      await shot('filter-open');
      note({ engine: engineName, viewport: vpName, state: 'filter-dropdown-after-tap', openedPanels: opened, ...(await page.evaluate(PROBE)) });
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'filter-dropdown-after-tap', error: e.message.split('\n')[0] }); }

    // ---- 4. quick view ----------------------------------------------------
    try {
      await go('/directory');
      const qv = page.locator('button[aria-label^="Quick view"]').first();
      await qv.scrollIntoViewIfNeeded();
      await qv.click();
      await page.waitForTimeout(700);
      await shot('quickview');
      const modal = await page.evaluate(() => {
        const box = document.querySelector('.fixed.z-\\[100\\] > div, [class*="z-[100]"] > div');
        if (!box) return { found: false };
        const r = box.getBoundingClientRect();
        const shopBtn = box.querySelector('a[rel*="sponsored"]');
        const sr = shopBtn?.getBoundingClientRect();
        return {
          found: true,
          box: `${Math.round(r.width)}x${Math.round(r.height)}`,
          top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight,
          scrollH: box.scrollHeight, clientH: box.clientHeight,
          contentClipped: box.scrollHeight > box.clientHeight + 2,
          shopButton: sr ? { bottom: Math.round(sr.bottom), boxBottom: Math.round(r.bottom), reachable: sr.bottom <= r.bottom + 2 } : null,
        };
      });
      note({ engine: engineName, viewport: vpName, state: 'quickview-open', modal, ...(await page.evaluate(PROBE)) });
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'quickview-open', error: e.message.split('\n')[0] }); }

    // ---- 5. favourites, populated ----------------------------------------
    try {
      await go('/');
      await page.evaluate(() => {
        const mk = (i) => ({
          id: `demo:${i}`, brandSlug: 'demo', brandName: 'Demo House',
          title: `A rather long product title that will wrap onto two lines ${i}`,
          price: 129.95 + i, currency: 'GBP',
          image: 'https://cdn.shopify.com/s/files/1/0000/0000/products/x.jpg',
          url: 'https://example.com/p', garment: 'dress', occasion: ['everyday'],
          community: 'hijabi', inStock: true,
        });
        const favs = {};
        for (let i = 0; i < 5; i++) favs[`demo:${i}`] = mk(i);
        localStorage.setItem('tmh_favs', JSON.stringify(favs));
      });
      await go('/favourites');
      await page.waitForTimeout(500);
      await shot('favourites-filled');
      note({ engine: engineName, viewport: vpName, state: 'favourites-populated', ...(await page.evaluate(PROBE)) });
      await page.evaluate(() => localStorage.removeItem('tmh_favs'));
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'favourites-populated', error: e.message.split('\n')[0] }); }

    // ---- 6. currency switcher (desktop bar) -------------------------------
    //
    // The old locator here was `header button` filtered by hasText
    // /GBP|USD|EUR|Native|Brand/. The trigger renders `{preference ?? null}`,
    // so on the DEFAULT "As listed" setting it has no text at all — the filter
    // never matched, isVisible() was false, and this section logged
    // "not present at this width" on every run at every width. It had never
    // actually opened the menu. Match on the aria-label instead, which exists
    // in both states.
    try {
      await go('/directory');
      const cur = page.locator('header button[aria-label*="currency" i]').first();
      if (await cur.isVisible().catch(() => false)) {
        const open = () => page.evaluate(() => {
          const m = document.querySelector('[role="menu"],[role="radiogroup"]');
          return !!m && m.getBoundingClientRect().width > 0;
        });

        if (vp.touch) {
          // §10.25 guard. A touch device has no hover, so tap is the only way
          // in. This is the case that matters at >=1024px: an iPad in landscape
          // gets the desktop header, and a hover-only trigger would be dead.
          await cur.tap();
          await page.waitForTimeout(500);
          const opened = await open();
          await shot('currency-open');
          note({ engine: engineName, viewport: vpName, state: 'currency-menu-open',
                 openedOnTap: opened, ...(opened ? {} : { PROBLEM: 'TAP DID NOT OPEN THE CURRENCY MENU' }) });
        } else {
          // Hover drives it on a mouse. The bug this replaced: clicking the
          // trigger PINNED the menu open (Base UI promotes a hover-opened menu
          // to click-opened), so moving the pointer away no longer closed it —
          // reported as "when i click the currency button it stays".
          await cur.hover();
          await page.waitForTimeout(450);
          const openedOnHover = await open();
          await shot('currency-open');

          await cur.click();
          await page.waitForTimeout(450);
          const survivedClick = await open();

          await page.mouse.move(20, vp.height - 60);
          await page.waitForTimeout(700);
          const closedAfterClick = !(await open());

          note({
            engine: engineName, viewport: vpName, state: 'currency-menu-open',
            openedOnHover, survivedClick, closedAfterClick,
            ...(openedOnHover && survivedClick && closedAfterClick ? {} : {
              PROBLEM: !openedOnHover ? 'HOVER DID NOT OPEN THE CURRENCY MENU'
                : !survivedClick ? 'CLICK CLOSED IT — hover and click are fighting'
                : 'PINNED OPEN AFTER A CLICK — hover-out no longer closes it',
            }),
          });
        }
      } else {
        note({ engine: engineName, viewport: vpName, state: 'currency-menu-open', skipped: 'not present at this width' });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'currency-menu-open', error: e.message.split('\n')[0] }); }

    // ---- 7. header search, opened and typed -------------------------------
    //
    // Was `hero-search-typed`, targeting `.glass-search input` — i.e.
    // components/HeroSearch.tsx, a component with ZERO importers that was
    // DELETED on 2026-08-26. The homepage's search became the header one at
    // some point and nobody moved the check with it. So it reported
    // `FAILED: locator.click: Timeout 30000ms exceeded` on EVERY run, at all
    // four viewports in BOTH engines, against a homepage that has no such
    // control — confirmed still failing identically on production, which is
    // how it was established as a dead check rather than a broken feature.
    // That is the fourth time a check in this file has died to a rename or a
    // removal (§10.29, §10.32 twice, §10.38). A selector in a script is a
    // reference no compiler can see.
    //
    // The real control is behind a TRIGGER — the field does not exist until
    // it is opened — which is precisely the class of state this audit exists
    // for (§10.25). Both the desktop and mobile triggers carry
    // aria-label="Search" when closed, so one locator covers every viewport;
    // the visible one is picked because both are in the DOM at once and the
    // width decides which shows.
    try {
      await go('/');
      const triggers = page.locator('header button[aria-label="Search"]');
      let opened = false;
      for (let i = 0; i < await triggers.count(); i++) {
        const t = triggers.nth(i);
        if (!(await t.isVisible().catch(() => false))) continue;
        if (vp.touch) await t.tap(); else await t.click();
        opened = true;
        break;
      }
      if (!opened) {
        note({ engine: engineName, viewport: vpName, state: 'header-search-typed', PROBLEM: 'NO VISIBLE SEARCH TRIGGER' });
      } else {
        await page.waitForTimeout(700);
        const input = page.locator('.header-search-input').first();
        if (!(await input.isVisible().catch(() => false))) {
          note({ engine: engineName, viewport: vpName, state: 'header-search-typed', PROBLEM: 'SEARCH FIELD DID NOT OPEN' });
        } else {
          await input.fill('abaya');
          await page.waitForTimeout(400);
          const typed = await input.inputValue();
          await shot('header-search-typed');
          note({
            engine: engineName, viewport: vpName, state: 'header-search-typed',
            ...(await page.evaluate(PROBE)),
            // Asserting the VALUE, not merely that a field appeared: a field
            // that opens but does not accept input would otherwise read as ok.
            ...(typed === 'abaya' ? {} : { PROBLEM: `FIELD DID NOT ACCEPT INPUT (got "${typed}")` }),
          });
        }
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'header-search-typed', error: e.message.split('\n')[0] }); }

    // ---- 8. contact form, submitted empty --------------------------------
    try {
      await go('/contact');
      const submit = page.locator('form button[type="submit"]').first();
      if (await submit.isVisible().catch(() => false)) {
        await submit.scrollIntoViewIfNeeded();
        await shot('contact-form');
        note({ engine: engineName, viewport: vpName, state: 'contact-form', ...(await page.evaluate(PROBE)) });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'contact-form', error: e.message.split('\n')[0] }); }

    // ---- 8b. the language note in the grid corner (new 2026-08-28) --------
    //
    // Tina's "little i in the corner", answering why a brand's own product page
    // may not be in English. It exists ONLY after a tap, so no static render can
    // see it (§10.25), and its first version shipped a defect that geometry
    // could not detect either: the panel was on-screen, correctly sized and
    // fully populated, while ProductCard's whole-card anchor (`absolute inset-0
    // z-10`) painted over every point of it. Visually the card's "+N colours"
    // badge bled through; functionally a tap on the note navigated the reader
    // out to a brand's site. That is §10.22 — an automated pass proves only what
    // it measures — so the assertion here is elementFromPoint over the panel
    // (§10.36's technique), not its rectangle.
    try {
      await go('/modest-dresses');
      const trg = page.getByRole('button', { name: /another language/i }).first();
      if (!(await trg.count())) {
        note({ engine: engineName, viewport: vpName, state: 'language-note', PROBLEM: 'LANGUAGE NOTE TRIGGER ABSENT' });
      } else {
        if (vp.touch) await trg.tap(); else await trg.click();
        await page.waitForTimeout(400);
        await shot('language-note-open');
        note({
          engine: engineName, viewport: vpName, state: 'language-note',
          ...(await page.evaluate(() => {
            const cands = [...document.querySelectorAll('*')].filter((n) => n.textContent?.includes('Some brands only publish'));
            const inner = cands[cands.length - 1];
            if (!inner) return { PROBLEM: 'LANGUAGE NOTE DID NOT OPEN ON TAP' };
            const panel = inner.closest('[class*=rounded]') || inner.parentElement;
            const r = panel.getBoundingClientRect();
            if (r.left < 0 || r.right > window.innerWidth + 1) {
              return { PROBLEM: `LANGUAGE NOTE OFF-SCREEN (${Math.round(r.left)}..${Math.round(r.right)} / ${window.innerWidth})` };
            }
            for (let fx = 0.15; fx <= 0.85; fx += 0.35) {
              for (let fy = 0.15; fy <= 0.85; fy += 0.35) {
                const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
                if (hit && !panel.contains(hit) && hit !== panel) {
                  return { PROBLEM: `LANGUAGE NOTE OCCLUDED BY ${hit.tagName}.${(hit.className || '').toString().split(' ').slice(0, 2).join('.')}` };
                }
              }
            }
            return { noteBox: `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.left)}` };
          })),
        });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'language-note', error: e.message.split('\n')[0] }); }

    // ---- 9. currency control in the footer (new 2026-08-10) ---------------
    //
    // Not covered by §6 above, which tests the HEADER control: that one lives
    // in `hidden lg:flex` and opens on hover, this one is present at every
    // width and opens on click/tap. The failure mode specific to it is
    // position: it sits in the last row of the page and opens UPWARDS, so a
    // popup that lands off the bottom edge would be both unusable and
    // invisible to any static render. Runs LAST because picking a currency
    // writes a site-wide preference to localStorage.
    try {
      await go('/directory');
      const trg = page.locator('.footer-currency-trigger').first();
      await trg.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      if (vp.touch) await trg.tap(); else await trg.click();
      await page.waitForTimeout(600);
      const menu = await page.evaluate(() => {
        // `[role="menuitem"]`, NOT `menuitemradio`. The rows were Base UI
        // RadioItems until 2026-08-25, when the CURRENT currency stopped being
        // listed at all (Tina: "i dont want to see the currency ive selected in
        // the currency list") and a radio group stopped being the honest
        // primitive — they are plain Menu.Items now, so the role changed with
        // them. Left unfixed, this selector would have matched nothing and
        // reported FOOTER CURRENCY MENU DID NOT OPEN ON TAP on a menu that
        // opens perfectly well, at every viewport in both engines: §10.29 and
        // §10.32, twice each, for exactly this reason. A role in a script is a
        // reference no compiler can see.
        const items = [...document.querySelectorAll('[role="menuitem"]')];
        if (!items.length) return { PROBLEM: 'FOOTER CURRENCY MENU DID NOT OPEN ON TAP' };
        const pop = items[0].closest('[data-base-ui-popup]') || items[0].parentElement;
        const r = pop.getBoundingClientRect();
        const inView = r.top >= -1 && r.bottom <= window.innerHeight + 1
          && r.left >= -1 && r.right <= document.documentElement.clientWidth + 1;
        const flagless = items.filter((i) => !i.querySelector('svg')).map((i) => i.textContent.trim());
        // One SHORT of DISPLAY_CURRENCIES: the currency you are already in is
        // deliberately absent (see the role note above). 15 of 16 as of
        // 2026-08-25, when seven were added from Pulse — this number tracks
        // lib/fx.ts and has to move with it. Asserted rather than merely
        // reported, so that a regression which puts the selected one back is a
        // PROBLEM and not a number nobody reads — §10.28, a check that cannot
        // fail is not a check.
        return {
          currencyOptions: items.length,
          ...(items.length !== 15
            ? { PROBLEM: `FOOTER CURRENCY LIST HAS ${items.length} OPTIONS, EXPECTED 15 (DISPLAY_CURRENCIES minus the selected one)` }
            : {}),
          ...(!inView
            ? { PROBLEM: `FOOTER CURRENCY MENU OUTSIDE THE VIEWPORT (${Math.round(r.top)}..${Math.round(r.bottom)} / ${window.innerHeight})` }
            : flagless.length
              ? { PROBLEM: `FOOTER CURRENCY OPTION WITH NO FLAG: ${flagless.join(', ')}` }
              : {}),
        };
      });
      await shot('footer-currency-open');
      // Opening it is half the check. Pick GBP and confirm the preference
      // actually took — a menu that opens and changes nothing is the §10.28
      // shape, where a check passes because it never asserted the outcome.
      // GBP unless the trigger ALREADY reads GBP — since 2026-08-25 the
      // current currency is not in the list, so a run that arrives already set
      // to GBP would find zero matches, leave `applied` null, and pass without
      // asserting anything (§10.28: a check whose "did not run" looks like its
      // "passed"). `pick` is therefore chosen against what the trigger says,
      // and its absence is a PROBLEM rather than a silent skip.
      let applied = null;
      const before = (await trg.innerText()).trim();
      const pick = /GBP/.test(before) ? 'EUR' : 'GBP';
      const opt = page.locator('[role="menuitem"]', { hasText: pick }).first();
      const pickable = await opt.count();
      if (pickable) {
        if (vp.touch) await opt.tap(); else await opt.click();
        await page.waitForTimeout(600);
        applied = (await trg.innerText()).trim();
      }
      note({
        engine: engineName, viewport: vpName, state: 'footer-currency', applied, picked: pick, ...menu,
        ...(menu.PROBLEM ? {}
          : !pickable ? { PROBLEM: `${pick} WAS NOT IN THE FOOTER CURRENCY LIST (trigger read "${before}")` }
          : !new RegExp(pick).test(applied ?? '')
            ? { PROBLEM: `CHOOSING A CURRENCY DID NOT APPLY — trigger still reads "${applied}"` }
            : {}),
      });
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'footer-currency', error: e.message.split('\n')[0] }); }

    await context.close();
  }
  await browser.close();
}

writeFileSync(new URL('report.json', OUT), JSON.stringify(report, null, 2));

console.log(`\nINTERACTION AUDIT — ${BASE}\n${'='.repeat(70)}`);
for (const r of report) {
  const bits = [];
  if (r.error) bits.push(`FAILED: ${r.error}`);
  if (r.skipped) bits.push(`skipped (${r.skipped})`);
  if (r.overflowX) bits.push('HORIZONTAL OVERFLOW');
  for (const o of r.offscreen || []) bits.push(`OFFSCREEN control "${o.text}" ${o.left}..${o.right} in ${o.vw}  ${o.sel}`);
  for (const c of r.clippedControls || []) bits.push(`CLIPPED control "${c.text}" bottom ${c.elBottom} > box ${c.boxBottom}  by ${c.by}`);
  if (r.openedPanels) bits.push(r.openedPanels.length ? `panel opened (${r.openedPanels.map((p) => `${p.w}px @${p.left}..${p.right}/${p.vw}`).join(', ')})` : 'PANEL DID NOT OPEN ON TAP');
  if (r.modal) {
    if (!r.modal.found) bits.push('modal not found');
    else {
      bits.push(`modal ${r.modal.box} top ${r.modal.top} bottom ${r.modal.bottom} / vh ${r.modal.vh}`);
      if (r.modal.contentClipped) bits.push(`MODAL CONTENT CLIPPED ${r.modal.clientH} < ${r.modal.scrollH}`);
      if (r.modal.shopButton && !r.modal.shopButton.reachable) bits.push('SHOP BUTTON CUT OFF');
    }
  }
  if (r.reach?.found && r.reach.lastBottom > r.reach.vh) bits.push(`menu last row below fold after scroll (${r.reach.lastBottom} > ${r.reach.vh})`);
  // Generic escape hatch, and it is load-bearing. This reporter builds its
  // output from a hard-coded list of keys, so a note carrying a field the loop
  // does not know about produces NO bits and prints "ok" — a failing check that
  // reports success. That happened: the currency assertions below were added,
  // set `PROBLEM`, and the audit cheerfully passed on code that had the bug.
  // Any check may set PROBLEM and be seen. Prefer it to adding another key here.
  if (r.noteBox) bits.push(`language note ${r.noteBox}`);
  if (r.PROBLEM) bits.push(r.PROBLEM);
  if (!bits.length) bits.push('ok');
  console.log(`${r.state.padEnd(26)} ${r.viewport.padEnd(13)} ${r.engine.padEnd(9)} ${bits.join('\n' + ' '.repeat(50))}`);
}
console.log(`\nscreenshots in .audit/interaction/`);
