// Mobile + accessibility audit. Renders every route in headless Chromium at
// phone size, then reports the two things that cannot be established by reading
// source: what actually overflows the viewport, and what axe flags.
//
//   npm run audit:mobile            # against a local `next start`
//   BASE=https://themodestyhouse.com npm run audit:mobile
//
// Screenshots land in .audit/ (gitignored).
import { chromium, devices } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3150';
const ROUTES = [
  '/', '/directory', '/designers', '/editorial', '/about',
  '/favourites', '/contact', '/modest-dresses', '/privacy',
];

const OUT = new URL('../.audit/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const report = [];

for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  let res;
  try {
    res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    report.push({ route, error: e.message });
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
      // Tap targets below the 24x24 CSS px floor in WCAG 2.2 (2.5.8).
      smallTargets: [...document.querySelectorAll('a,button,[role="button"],input,select')]
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

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const name = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
  await page.screenshot({ path: new URL(`${name}.png`, OUT).pathname, fullPage: false });

  report.push({
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
writeFileSync(new URL('report.json', OUT), JSON.stringify(report, null, 2));

// ---- console summary -------------------------------------------------------
console.log(`\nMOBILE AUDIT — ${BASE} @ iPhone 13 (390px)\n${'='.repeat(58)}`);
for (const r of report) {
  if (r.error) { console.log(`\n${r.route}\n  FAILED: ${r.error}`); continue; }
  const flag = r.overflows ? `OVERFLOWS to ${r.scrollWidth}px` : 'fits';
  console.log(`\n${r.route}  [${r.status}]  ${flag}`);
  for (const o of r.offenders) console.log(`   overflow: <${o.tag}> right=${o.right} w=${o.width} .${o.cls}`);
  for (const t of r.smallTargets) console.log(`   tap target ${t.w}x${t.h}: <${t.tag}> ${t.text}`);
  const byImpact = {};
  for (const v of r.violations) (byImpact[v.impact] ??= []).push(v);
  for (const [imp, vs] of Object.entries(byImpact)) {
    for (const v of vs) console.log(`   a11y [${imp}] ${v.id} x${v.nodes} — ${v.help}`);
  }
}
const totalV = report.reduce((a, r) => a + (r.violations?.length || 0), 0);
const over = report.filter((r) => r.overflows).length;
console.log(`\n${'='.repeat(58)}`);
console.log(`pages overflowing: ${over}/${report.length} | distinct a11y violations: ${totalV}`);
console.log(`screenshots + report.json in .audit/`);
