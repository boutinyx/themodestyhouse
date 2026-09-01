/**
 * The catalogue grid, driven as a SIGNED-IN STAFF MEMBER.
 *
 * Why this exists as its own audit rather than a check inside
 * scripts/interaction-audit.mjs: every check in that file runs anonymously,
 * and the defect this covers is invisible without a staff session. Tina,
 * 2026-08-29: *"when i login on staff/curate and go to a catalog and click
 * load more it crashes"*, then *"if i click the load more button after having
 * edited a product instead of loading more down it jumps up to the beginning"*.
 *
 * The bug: a staff edit changes the published row count immediately, so the
 * next /api/catalogue/cards request 409s ("catalogue moved"), and the grids
 * answered a 409 with `window.location.reload()`. Correct about the data —
 * stale row indices would paint the WRONG products under the right titles —
 * but it threw away `visible` (back to the first 24) and the scroll position
 * after EVERY edit. Fixed by refreshing the server payload in place instead.
 *
 * Three things are asserted, and the third is the one that keeps the fix
 * honest — it is the property the old hard reload existed to protect:
 *   1. after an edit, Load more actually loads more
 *   2. it does so without a full page load
 *   3. every rendered card is still distinct (a shifted index shows up as a
 *      duplicate or a dropped product)
 *
 * SKIPS LOUDLY when ADMIN_PASSWORD is unset — a check that skips in silence is
 * a check you do not have (CLAUDE.md §10.28 rule 3).
 *
 * Usage:
 *   npm run build && npx next start -p 3211
 *   ADMIN_PASSWORD=… npm run audit:staff-grid
 *   BASE=… ENGINE=webkit npm run audit:staff-grid
 */
import { chromium, webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3211';
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const ONLY = process.env.ENGINE;
const ROUTE = process.env.ROUTE || '/new-in';

if (!PASSWORD) {
  console.log('staff-grid-audit SKIPPED — ADMIN_PASSWORD is not set.');
  console.log('  This check cannot run anonymously; set it and re-run, or know that');
  console.log('  the staff grid is UNVERIFIED by this pass.');
  process.exit(0);
}

const engines = [['chromium', chromium], ['webkit', webkit]].filter(([n]) => !ONLY || n === ONLY);
let problems = 0;

for (const [name, engine] of engines) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // WebKit honours HSTS and upgrade-insecure-requests over plain-http
  // localhost, so every subresource fails TLS and the page renders with no
  // CSS — CLAUDE.md §10.24. Strip both, for local http only.
  if (name === 'webkit' && BASE.startsWith('http://')) {
    await ctx.route('**/*', async (route) => {
      try {
        const res = await route.fetch();
        const headers = { ...res.headers() };
        delete headers['strict-transport-security'];
        if (headers['content-security-policy']) {
          headers['content-security-policy'] = headers['content-security-policy'].replace('upgrade-insecure-requests', '');
        }
        await route.fulfill({ response: res, headers });
      } catch {
        await route.abort();
      }
    });
  }

  const login = await ctx.request.post(`${BASE}/api/staff/login`, { data: { password: PASSWORD } });
  if (!login.ok()) {
    console.log(`${name}: PROBLEM — staff login failed (${login.status()}). Wrong ADMIN_PASSWORD for ${BASE}?`);
    problems++;
    await browser.close();
    continue;
  }

  const page = await ctx.newPage();
  let fullLoads = 0;
  page.on('load', () => { fullLoads++; });
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-surface="product-card"]', { timeout: 25000 });

  const cards = () => page.locator('[data-surface="product-card"]').count();
  const loadMore = () => page.getByRole('button', { name: /load more/i }).first();

  for (let i = 0; i < 4; i++) {
    if (!(await loadMore().count())) break;
    await loadMore().click();
    await page.waitForTimeout(500);
  }

  const pencils = page.locator('[aria-label="Edit this product (staff)"]');
  const pencilCount = await pencils.count();
  if (pencilCount === 0) {
    console.log(`${name}: PROBLEM — signed in, but no staff edit controls rendered.`);
    problems++;
    await browser.close();
    continue;
  }

  const victim = Math.max(0, pencilCount - 20);
  await pencils.nth(victim).scrollIntoViewIfNeeded();
  await pencils.nth(victim).click();
  await page.waitForTimeout(600);
  const del = page.getByRole('menuitem', { name: /^DELETE$/i });
  if (!(await del.count())) {
    console.log(`${name}: PROBLEM — the staff pencil menu has no DELETE item.`);
    problems++;
    await browser.close();
    continue;
  }
  await del.first().click();
  await page.waitForTimeout(2000);

  const before = await cards();
  fullLoads = 0;
  await loadMore().click();
  await page.waitForTimeout(2500);
  const after = await cards();

  const shape = await page.evaluate(() => {
    const as = [...document.querySelectorAll('a[data-surface="product-card"]')];
    const hrefs = as.map((a) => a.getAttribute('href'));
    return { count: as.length, unique: new Set(hrefs).size };
  });

  const grew = after > before;
  const noReload = fullLoads === 0;
  const distinct = shape.count === shape.unique;
  const ok = grew && noReload && distinct;
  if (!ok) problems++;

  console.log(
    `${name} ${ROUTE}: after a staff edit, load more -> ${before} -> ${after} cards | full page loads ${fullLoads} | distinct ${shape.unique}/${shape.count} — ${ok ? 'ok' : 'PROBLEM'}`,
  );
  if (!grew) console.log('    PROBLEM: the grid did not grow — it reset to the beginning.');
  if (!noReload) console.log('    PROBLEM: the page fully reloaded, discarding scroll position and loaded rows.');
  if (!distinct) console.log('    PROBLEM: duplicate cards — a stale row index is addressing the wrong product.');

  await browser.close();
}

console.log(problems === 0 ? '\n0 problems' : `\n${problems} problem(s)`);
process.exit(problems === 0 ? 0 : 1);
