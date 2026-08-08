// Mobile + accessibility audit. Renders every route at phone size in BOTH
// Chromium and WebKit, then reports the things that cannot be established by
// reading source: what actually overflows the viewport, what text is drawn on
// top of other text, what is too small to tap, and what axe flags.
//
//   npm run audit:mobile              # against a local `next start`
//   ENGINE=chromium npm run audit:mobile      # one engine only, quicker
//   BASE=https://themodestyhouse.com npm run audit:mobile
//
// WHY BOTH ENGINES: every iPhone is WebKit, and the two disagree. Shipped
// 2026-08-08: a percentage `max-height` against a parent sized by `aspect-ratio`
// computes to the percentage in Chromium and to `none` in WebKit, so the
// StyleIt artwork had no cap on iOS, rendered at natural size and covered its
// captions. Chromium-only auditing reported that page clean. → CLAUDE.md §10.24.
//
// Screenshots land in .audit/ (gitignored), suffixed per engine.
import { chromium, webkit, devices } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3150';
const ROUTES = [
  '/', '/directory', '/designers', '/editorial', '/about',
  '/favourites', '/contact', '/modest-dresses', '/privacy',
];
const ENGINES = { chromium, webkit };
const PICK = process.env.ENGINE;
const TO_RUN = PICK ? [[PICK, ENGINES[PICK]]] : Object.entries(ENGINES);
if (PICK && !ENGINES[PICK]) {
  console.error(`Unknown ENGINE "${PICK}" — use chromium or webkit.`);
  process.exit(1);
}
/** Local http only. The site sends HSTS and `upgrade-insecure-requests`, both
 *  right in production; over plain http WebKit honours them, rewrites every
 *  subresource to https:// and fails TLS, so the page renders with NO CSS and
 *  every measurement below is meaningless. Chromium exempts localhost, WebKit
 *  does not. The site is untouched — this only affects the test client. */
const LOCAL = /^http:\/\/localhost:/.test(BASE);

const OUT = new URL('../.audit/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const report = [];
for (const [engineName, engine] of TO_RUN) {
const browser = await engine.launch();
const context = await browser.newContext({ ...devices['iPhone 13'], bypassCSP: LOCAL });
if (LOCAL) {
  await context.route('**/*', async (route) => {
    const url = route.request().url().replace(/^https:\/\/localhost:/, 'http://localhost:');
    try {
      const res = await route.fetch({ url });
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
const page = await context.newPage();

for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  let res;
  try {
    // 'networkidle' as a hard requirement makes this unusable against `next dev`:
    // the HMR websocket never goes quiet, so WebKit times out on every route.
    // Load first, then give the network a bounded chance to settle so lazy
    // images have arrived before anything is measured.
    res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  } catch (e) {
    // engine tag matters: the summary groups by it, so an untagged failure
    // silently vanishes from the report instead of being counted.
    report.push({ engine: engineName, route, error: e.message });
    continue;
  }

  // Horizontal overflow, and WHICH elements cause it. A page that scrolls
  // sideways on a phone is the single most common mobile defect, and the only
  // reliable way to find the culprit is to measure every box in the layout.
  const layout = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        // An element inside a scroll container is not a page-level defect.
        let p = el.parentElement, clipped = false;
        while (p && p !== document.body) {
          const pc = getComputedStyle(p);
          if (/(auto|scroll|hidden)/.test(pc.overflowX)) { clipped = true; break; }
          p = p.parentElement;
        }
        if (clipped) continue;
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 70),
          left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
          display: cs.display,
        });
      }
    }
    return {
      vw,
      scrollWidth: document.documentElement.scrollWidth,
      overflows: document.documentElement.scrollWidth > vw + 1,
      offenders: offenders.slice(0, 6),
      // Text stacked on top of other text. An absolutely-positioned child whose
      // card is made `position: static` by a mobile media query loses its
      // containing block and resolves against a further-out ancestor instead —
      // so every sibling lands on the SAME point and renders as mush. That is a
      // real bug this audit shipped a clean report over (VerifiedSpotlight, all
      // four captions at (54,3018) on iPhone 13). Identical rect + different
      // text is the signature, and it almost never happens by accident.
      stackedText: (() => {
        const byRect = new Map();
        for (const el of document.querySelectorAll('body *')) {
          if (getComputedStyle(el).position !== 'absolute') continue;
          const t = (el.textContent || '').trim();
          if (!t) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}`;
          if (!byRect.has(key)) byRect.set(key, []);
          byRect.get(key).push(t.slice(0, 30));
        }
        return [...byRect.entries()]
          .filter(([, texts]) => new Set(texts).size > 1)
          .slice(0, 4)
          .map(([at, texts]) => ({ at, texts }));
      })(),
      // A box with a declared `aspect-ratio` that is NOT at that ratio, which
      // means its content grew and pushed it out of shape.
      // This is the signature of the WebKit bug in the header comment. Checking
      // "does the image overflow its parent" does NOT catch it: the frame is an
      // aspect-ratio box, so an oversized image makes the FRAME grow rather than
      // spilling out of it, and the damage lands on whatever sat next to it.
      // Measuring the ratio itself catches the cause instead of the symptom.
      brokenAspect: [...document.querySelectorAll('body *')]
        .map((el) => {
          const cs = getComputedStyle(el);
          const ar = cs.aspectRatio;
          if (!ar || ar === 'auto') return null;
          // A rotated or scaled box reports its axis-aligned BOUNDING box, which
          // legitimately does not match the declared ratio. The fanned cards in
          // VerifiedSpotlight are rotated by design and were flagged 4x per page.
          if (cs.transform && cs.transform !== 'none') return null;
          if (cs.rotate && cs.rotate !== 'none') return null;
          if (cs.scale && cs.scale !== 'none' && cs.scale !== '1') return null;
          // Computed form is either "a / b" or a bare number.
          const m = ar.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
          const ratio = m ? Number(m[1]) / Number(m[2]) : Number(ar);
          if (!ratio || !isFinite(ratio)) return null;
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) return null;
          const expected = r.width / ratio;
          const off = r.height - expected;
          if (Math.abs(off) <= 2) return null;
          return {
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 46),
            declared: ar,
            box: `${Math.round(r.width)}x${Math.round(r.height)}`,
            expectedH: Math.round(expected),
            offBy: Math.round(off),
          };
        })
        .filter(Boolean)
        .slice(0, 6),
      // Tap targets below the 24x24 CSS px floor in WCAG 2.2 (2.5.8).
      smallTargets: [...document.querySelectorAll('a,button,[role="button"],input,select')]
        // Nothing a person can reach is a tap target. tabindex=-1 and
        // aria-hidden are how the spam honeypot in NewsletterSignup and the
        // duplicated marquee copy declare themselves unreachable — reporting
        // them as 1x1 failures trains the reader to ignore this whole list.
        .filter((el) => el.getAttribute('tabindex') !== '-1' && !el.closest('[aria-hidden="true"]'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24))
        .slice(0, 8)
        .map(({ el, r }) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 24),
          w: Math.round(r.width), h: Math.round(r.height),
        })),
    };
  });

  // Non-fatal. Against `next dev` an HMR reload can destroy the execution
  // context mid-analysis and take the whole run down with it; one route's
  // missing a11y pass is not worth losing the other eight routes' layout data.
  // Run against a production build (`next start`) for a complete report.
  let axe = { violations: [] };
  try {
    axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
  } catch (e) {
    console.error(`   (axe failed on ${route} in ${engineName}: ${e.message.split('\n')[0]})`);
  }

  const base = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
  const name = `${base}-${engineName}`;
  await page.screenshot({ path: new URL(`${name}.png`, OUT).pathname, fullPage: false });
  // ALSO full-page. The above-the-fold shot is what made a screenful of
  // overlapping captions invisible to a reviewer reading a clean report — the
  // defect was simply further down the page than the screenshot went.
  await page.screenshot({ path: new URL(`${name}-full.png`, OUT).pathname, fullPage: true });

  report.push({
    engine: engineName,
    route,
    status: res?.status(),
    ...layout,
    violations: axe.violations.map((v) => ({
      id: v.id, impact: v.impact, nodes: v.nodes.length,
      help: v.help, sample: v.nodes[0]?.html?.slice(0, 90),
    })),
  });
}

await browser.close();
}
writeFileSync(new URL('report.json', OUT), JSON.stringify(report, null, 2));

// ---- console summary -------------------------------------------------------
console.log(`\nMOBILE AUDIT — ${BASE} @ iPhone 13 (390px)`);
for (const [engineName] of TO_RUN) {
  const rows = report.filter((r) => r.engine === engineName);
  console.log(`\n${'='.repeat(58)}\n${engineName.toUpperCase()}\n${'='.repeat(58)}`);
  for (const r of rows) {
    if (r.error) { console.log(`\n${r.route}\n  FAILED: ${r.error}`); continue; }
    const flag = r.overflows ? `OVERFLOWS to ${r.scrollWidth}px` : 'fits';
    console.log(`\n${r.route}  [${r.status}]  ${flag}`);
    for (const o of r.offenders) console.log(`   overflow: <${o.tag}> right=${o.right} w=${o.width} .${o.cls}`);
    for (const t of r.smallTargets) console.log(`   tap target ${t.w}x${t.h}: <${t.tag}> ${t.text}`);
    for (const s of r.stackedText || []) console.log(`   STACKED TEXT at ${s.at}: ${s.texts.join(' | ')}`);
    for (const a of r.brokenAspect || []) console.log(`   ASPECT BROKEN <${a.tag}> declared ${a.declared}, box ${a.box}, expected h=${a.expectedH} (off by ${a.offBy}px) .${a.cls}`);
    const byImpact = {};
    for (const v of r.violations) (byImpact[v.impact] ??= []).push(v);
    for (const [imp, vs] of Object.entries(byImpact)) {
      for (const v of vs) console.log(`   a11y [${imp}] ${v.id} x${v.nodes} — ${v.help}`);
    }
  }
}
console.log(`\n${'='.repeat(58)}`);
for (const [engineName] of TO_RUN) {
  const rows = report.filter((r) => r.engine === engineName);
  const totalV = rows.reduce((a, r) => a + (r.violations?.length || 0), 0);
  const over = rows.filter((r) => r.overflows).length;
  const stacked = rows.reduce((a, r) => a + (r.stackedText?.length || 0), 0);
  const spill = rows.reduce((a, r) => a + (r.brokenAspect?.length || 0), 0);
  console.log(
    `${engineName.padEnd(9)} overflowing ${over}/${rows.length} | a11y ${totalV} | stacked text ${stacked} | broken aspect ${spill}`
  );
}
console.log(`screenshots + report.json in .audit/`);
