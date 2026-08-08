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
    try {
      await go('/');
      const products = page.locator('header').getByRole('button', { name: /styles/i }).first();
      if (await products.isVisible().catch(() => false)) {
        await products.click();
        await page.waitForTimeout(400);
        await shot('nav-styles-open');
        note({ engine: engineName, viewport: vpName, state: 'nav-dropdown-open', ...(await page.evaluate(PROBE)) });
      } else {
        note({ engine: engineName, viewport: vpName, state: 'nav-dropdown-open', skipped: 'desktop nav hidden at this width' });
      }
    } catch (e) { note({ engine: engineName, viewport: vpName, state: 'nav-dropdown-open', error: e.message.split('\n')[0] }); }

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
        const panels = [...document.querySelectorAll('.menu-scroll')];
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
    try {
      await go('/directory');
      const cur = page.locator('header button').filter({ hasText: /GBP|USD|EUR|Native|Brand/i }).first();
      if (await cur.isVisible().catch(() => false)) {
        await cur.click();
        await page.waitForTimeout(450);
        await shot('currency-open');
        note({ engine: engineName, viewport: vpName, state: 'currency-menu-open', ...(await page.evaluate(PROBE)) });
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
  if (!bits.length) bits.push('ok');
  console.log(`${r.state.padEnd(26)} ${r.viewport.padEnd(13)} ${r.engine.padEnd(9)} ${bits.join('\n' + ' '.repeat(50))}`);
}
console.log(`\nscreenshots in .audit/interaction/`);
