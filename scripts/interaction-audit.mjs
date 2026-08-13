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
    // "Products" is a LINK, not a button (the group carries an href to
    // /directory), which is why it is matched by text; and it opens on hover
    // with a mouse, on tap without one.
    try {
      await go('/directory');
      const products = page.locator('header').getByText('Products', { exact: true }).first();
      if (await products.isVisible().catch(() => false)) {
        if (vp.touch) await products.tap(); else await products.hover();
        await page.waitForTimeout(600);
        const panel = await page.evaluate(() => {
          // Found STRUCTURALLY — the portalled <nav> outside the header that
          // holds the links — not by the row's class. A check keyed to the
          // class of the fix reports "panel did not open" the moment the class
          // changes, i.e. it fails for a reason that has nothing to do with
          // what it is testing (§10.29, where a rename broke this very file).
          const popup = [...document.querySelectorAll('nav')]
            .find((n) => !n.closest('header') && n.querySelectorAll('a[href]').length >= 4);
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

    // ---- 2b. outerwear nav flyout (new 2026-08-13) ------------------------
    //
    // Hovering "Outerwear" inside the Products panel should pop open a
    // submenu of Blazers/Vests/Cardigans/Coats (Tina's request), each
    // pre-filtering /outerwear via ?type=. The row itself is not a link (see
    // NavMenu.tsx for why — an earlier cut that made it one navigated on a
    // bare touch tap instead of opening), so this also checks for the ghost
    // of that bug: does clicking a sub-item leave a stray flyout open over
    // the destination page, the same shape as the currency menu pinning open
    // after a click (§10.25's note in CurrencySwitcher.tsx).
    try {
      await go('/directory');
      const products = page.locator('header').getByText('Products', { exact: true }).first();
      if (await products.isVisible().catch(() => false)) {
        if (vp.touch) await products.tap(); else await products.hover();
        await page.waitForTimeout(500);
        // Found by COORDINATES, not page.getByText — NavigationMenu.Viewport
        // measures its content in an extra, invisible copy before showing it,
        // so a text locator's `.first()` can resolve to that clone rather
        // than the one actually on screen, and a synthetic hover on an
        // invisible element opens nothing. Same family as §10.32 (locate
        // structurally, not by something that can be duplicated).
        const rowBox = await page.evaluate(() => {
          const popup = [...document.querySelectorAll('nav')].find((n) => !n.closest('header') && n.querySelectorAll('a[href]').length >= 4);
          // The row itself carries no href (it only opens the flyout — see
          // NavMenu.tsx), so it's the one row in the panel WITHOUT one.
          const row = popup && [...popup.querySelectorAll('div,button')]
            .find((el) => el.offsetParent !== null && el.textContent?.trim().startsWith('Outerwear') && !el.querySelector('a'));
          if (!row) return null;
          const r = row.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        });
        if (rowBox) {
          if (vp.touch) await page.touchscreen.tap(rowBox.x, rowBox.y); else await page.mouse.move(rowBox.x, rowBox.y);
          await page.waitForTimeout(500);
          const flyout = await page.evaluate(() => {
            const menus = [...document.querySelectorAll('[role="menu"]')];
            const sub = menus.find((m) => [...m.querySelectorAll('a[href]')].some((a) => a.getAttribute('href')?.includes('/outerwear?type=')));
            if (!sub) return { PROBLEM: 'OUTERWEAR FLYOUT DID NOT OPEN' };
            const labels = [...sub.querySelectorAll('a[href]')].map((a) => a.textContent.trim());
            const expected = ['Blazers', 'Vests', 'Cardigans', 'Coats'];
            const mismatch = expected.length !== labels.length || expected.some((l, i) => labels[i] !== l);
            return { labels, ...(mismatch ? { PROBLEM: `OUTERWEAR FLYOUT ITEMS WRONG: ${JSON.stringify(labels)}` } : {}) };
          });
          await shot('outerwear-flyout-open');
          note({ engine: engineName, viewport: vpName, state: 'outerwear-flyout', ...flyout, ...(await page.evaluate(PROBE)) });

          if (!flyout.PROBLEM) {
            const blazersBox = await page.evaluate(() => {
              const menus = [...document.querySelectorAll('[role="menu"]')];
              const sub = menus.find((m) => [...m.querySelectorAll('a[href]')].some((a) => a.getAttribute('href')?.includes('/outerwear?type=')));
              const a = sub && [...sub.querySelectorAll('a[href]')].find((x) => x.getAttribute('href')?.endsWith('type=blazer'));
              if (!a) return null;
              const r = a.getBoundingClientRect();
              return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
            });
            if (vp.touch) await page.touchscreen.tap(blazersBox.x, blazersBox.y); else await page.mouse.click(blazersBox.x, blazersBox.y);
            await page.waitForTimeout(700);
            const landedUrl = page.url();
            const landed = landedUrl.includes('/outerwear?type=blazer') || landedUrl.endsWith('type=blazer');
            const stillOpen = await page.evaluate(() => {
              const m = [...document.querySelectorAll('[role="menu"]')]
                .find((x) => [...x.querySelectorAll('a[href]')].some((a) => a.getAttribute('href')?.includes('/outerwear?type=')));
              return !!m && m.getBoundingClientRect().width > 0;
            });
            // Polled, not a single read: mobile-emulated Chromium throttles CPU,
            // and a client-side Link navigation hydrates the new page async — a
            // single check soon after the click can run before FilterableGrid's
            // useState initializer has painted the chip. Direct navigation to
            // the same URL confirmed the pre-filter itself works at this width;
            // this loop is about giving hydration time, not about the feature.
            let typeChip = null;
            for (let i = 0; i < 6 && !typeChip; i++) {
              typeChip = await page.evaluate(() => {
                const chip = [...document.querySelectorAll('button')].find((b) => /^Blazers/.test(b.textContent?.trim() || ''));
                return chip ? chip.textContent.trim() : null;
              });
              if (!typeChip) await page.waitForTimeout(300);
            }
            note({
              engine: engineName, viewport: vpName, state: 'outerwear-flyout-navigate',
              landedUrl, landed, stillOpen, typeChip,
              ...(landed && !stillOpen && typeChip ? {} : {
                PROBLEM: !landed ? `SUB-ITEM DID NOT NAVIGATE TO ?type=blazer — at ${landedUrl}`
                  : stillOpen ? 'FLYOUT STAYED OPEN AFTER NAVIGATING AWAY'
                    : 'TYPE FILTER DID NOT PRE-SELECT BLAZERS ON LANDING',
              }),
            });
          }
        } else {
          note({ engine: engineName, viewport: vpName, state: 'outerwear-flyout', skipped: 'Outerwear row not visible after opening Products' });
        }
      } else {
        note({ engine: engineName, viewport: vpName, state: 'outerwear-flyout', skipped: 'desktop nav hidden at this width' });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'outerwear-flyout', error: e.message.split('\n')[0] }); }

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

    // ---- 7. hero search, typed -------------------------------------------
    try {
      await go('/');
      const input = page.locator('.glass-search input').first();
      await input.click();
      await input.fill('abaya');
      await page.waitForTimeout(600);
      await shot('hero-search-typed');
      note({ engine: engineName, viewport: vpName, state: 'hero-search-typed', ...(await page.evaluate(PROBE)) });
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'hero-search-typed', error: e.message.split('\n')[0] }); }

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
        const items = [...document.querySelectorAll('[role="menuitemradio"]')];
        if (!items.length) return { PROBLEM: 'FOOTER CURRENCY MENU DID NOT OPEN ON TAP' };
        const pop = items[0].closest('[data-base-ui-popup]') || items[0].parentElement;
        const r = pop.getBoundingClientRect();
        const inView = r.top >= -1 && r.bottom <= window.innerHeight + 1
          && r.left >= -1 && r.right <= document.documentElement.clientWidth + 1;
        const flagless = items.filter((i) => !i.querySelector('svg')).map((i) => i.textContent.trim());
        return {
          currencyOptions: items.length,
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
      let applied = null;
      const gbp = page.locator('[role="menuitemradio"]', { hasText: 'GBP' }).first();
      if (await gbp.count()) {
        if (vp.touch) await gbp.tap(); else await gbp.click();
        await page.waitForTimeout(600);
        applied = (await trg.innerText()).trim();
      }
      note({
        engine: engineName, viewport: vpName, state: 'footer-currency', applied, ...menu,
        ...(!menu.PROBLEM && applied !== null && !/GBP/.test(applied)
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
  if (r.PROBLEM) bits.push(r.PROBLEM);
  if (!bits.length) bits.push('ok');
  console.log(`${r.state.padEnd(26)} ${r.viewport.padEnd(13)} ${r.engine.padEnd(9)} ${bits.join('\n' + ' '.repeat(50))}`);
}
console.log(`\nscreenshots in .audit/interaction/`);
