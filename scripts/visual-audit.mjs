// Full-matrix responsive + visual audit.
//
// The mobile audit (scripts/mobile-audit.mjs) answers one question well: is the
// phone layout broken. This one widens it to the whole matrix — EVERY route, at
// desktop / tablet / phone widths, in BOTH engines — and adds the checks that
// caught real defects here but that a viewport-only, phone-only pass cannot see.
//
//   node scripts/visual-audit.mjs                     # everything (slow, thorough)
//   ROUTES=/,/new-in node scripts/visual-audit.mjs # a subset
//   ENGINE=chromium node scripts/visual-audit.mjs     # one engine
//   VIEWPORTS=mobile-390,desktop-1440 node scripts/visual-audit.mjs
//   BASE=https://themodestyhouse.com node scripts/visual-audit.mjs
//
// WHY THESE WIDTHS: two mobile thresholds coexist in this codebase — the
// hand-written CSS in globals.css breaks at 820px, Tailwind's `md:` at 768px.
// Anything between 768 and 820 gets the DESKTOP hand-written layout and the
// MOBILE Tailwind layout at the same time, which is exactly where a tablet
// lands. 768 / 819 / 820 are therefore deliberate, not round numbers.
//
// WHY BOTH ENGINES: every iPhone is WebKit, including Chrome for iOS. See
// CLAUDE.md §10.24 — a percentage max-height against an aspect-ratio parent
// computes in Chromium and to `none` in WebKit, and the Chromium-only audit
// reported the broken page clean, twice.
import { chromium, webkit } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3150';
const LOCAL = /^http:\/\/localhost:/.test(BASE);
// OUT is overridable so a second pass can be captured WITHOUT destroying the
// first. Learned by nearly doing it: a re-run after a round of fixes overwrites
// the screenshots any before/after comparison depends on, and anything still
// reading them gets a mix of the two.
const OUT = new URL(`../${process.env.OUT || '.audit/visual'}/`, import.meta.url);

const ALL_ROUTES = [
  '/', '/new-in', '/designers', '/editorial', '/about', '/favourites',
  '/contact', '/privacy', '/terms',
  '/editorial/back-to-class-no-fuss', '/editorial/still-boiling-feeling-fall',
  '/modest-dresses', '/modest-abayas', '/modest-hijabs', '/modest-skirts',
  '/modest-tops', '/modest-trousers', '/modest-sets', '/modest-swimwear',
  '/modest-activewear',
  // One brand page — the family added 2026-08-19. Veiled is the largest (782
  // pieces), so it is the worst case for grid weight and layout.
  '/designers/veiled',
  '/modest-summer-outfits',
  // /style/elegant, /style/streetwear and /style/maximalist were here until
  // 2026-08-09, when the aesthetic pages were retired (commit 4882496). Their
  // 404s were the only "new defect" in a whole 312-page run, which is worth
  // knowing: when a route disappears this list is the thing that has to be told.
];

// dpr 1 everywhere: a full-page shot of a 6000px grid at dpr 3 exceeds the
// engine's max texture size and comes back blank or throws. Legibility of the
// screenshots matters more than pixel density, and 1x is legible.
const ALL_VIEWPORTS = {
  'mobile-360': { width: 360, height: 740, isMobile: true, tier: 'mobile' },
  'mobile-390': { width: 390, height: 844, isMobile: true, tier: 'mobile' },
  'mobile-430': { width: 430, height: 932, isMobile: true, tier: 'mobile' },
  'tablet-768': { width: 768, height: 1024, isMobile: true, tier: 'tablet' },
  'tablet-819': { width: 819, height: 1180, isMobile: true, tier: 'tablet' },
  'tablet-1024': { width: 1024, height: 768, isMobile: true, tier: 'tablet' },
  // The width where the DESKTOP header first appears (--breakpoint-hdr,
  // 1152px) and is at its tightest: below it the phone drawer takes over,
  // above it the row only gets roomier, and at exactly 1152 the header row has
  // 30px of slack over the 1122px its contents need. Added 2026-08-27 with
  // that breakpoint — no other viewport here sits between 1024 and 1280, so
  // the whole band where the header runs on its tightened <xl spacing was
  // unrendered by this audit.
  'desktop-1152': { width: 1152, height: 800, tier: 'desktop' },
  'desktop-1280': { width: 1280, height: 800, tier: 'desktop' },
  'desktop-1440': { width: 1440, height: 900, tier: 'desktop' },
  'desktop-1920': { width: 1920, height: 1080, tier: 'desktop' },
};

const ENGINES = { chromium, webkit };
// WebKit runs the three canonical widths rather than all nine: it exists here to
// catch engine disagreement, and one width per tier is enough to find it.
const WEBKIT_VIEWPORTS = ['mobile-390', 'tablet-819', 'desktop-1440'];

const routes = process.env.ROUTES ? process.env.ROUTES.split(',') : ALL_ROUTES;
const viewportNames = process.env.VIEWPORTS
  ? process.env.VIEWPORTS.split(',')
  : Object.keys(ALL_VIEWPORTS);
const engineNames = process.env.ENGINE ? [process.env.ENGINE] : Object.keys(ENGINES);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);

mkdirSync(OUT, { recursive: true });

// A stray rejection from a closing context must not lose the pages already
// measured. Report it and carry on; the run's own error handling covers
// anything that is actually about the site.
process.on('unhandledRejection', (e) => {
  console.error(`\n  (ignored async error: ${String(e?.message || e).split('\n')[0]})`);
});

/** The whole audit is meaningless if the stylesheet did not load, and a
 *  no-CSS render still *looks* like a successful run in the log — it just
 *  reports a tall, single-column page with no overflow. WebKit over plain-http
 *  localhost honours HSTS + upgrade-insecure-requests and silently drops every
 *  subresource, which is precisely how that happens. Assert a known computed
 *  style on every single page and mark the row INVALID if it is absent.
 *  → CLAUDE.md §10.24. */
const CSS_PROOF = `(() => {
  const bg = getComputedStyle(document.body).backgroundColor;
  const ff = getComputedStyle(document.body).fontFamily;
  return { bg, ff, ok: bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && /Jost|Bodoni|Marcellus/i.test(ff) };
})()`;

const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const seen = (el) => {
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const ident = (el) => {
    const cls = (el.className || '').toString().replace(/\s+/g, '.').slice(0, 60);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`;
  };
  const inScroller = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) return true;
      p = p.parentElement;
    }
    return false;
  };

  const all = [...document.querySelectorAll('body *')];

  // --- 1. horizontal overflow -------------------------------------------
  const offenders = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      if (inScroller(el)) continue;
      offenders.push({
        sel: ident(el), left: Math.round(r.left), right: Math.round(r.right),
        width: Math.round(r.width), display: getComputedStyle(el).display,
      });
    }
  }

  // --- 2. text stacked on identical coordinates --------------------------
  const byRect = new Map();
  for (const el of all) {
    if (getComputedStyle(el).position !== 'absolute') continue;
    const t = (el.textContent || '').trim();
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}`;
    if (!byRect.has(key)) byRect.set(key, []);
    byRect.get(key).push(t.slice(0, 34));
  }
  const stackedText = [...byRect.entries()]
    .filter(([, t]) => new Set(t).size > 1)
    .slice(0, 6)
    .map(([at, texts]) => ({ at, texts }));

  // --- 3. general text-on-text collision ---------------------------------
  // Broader than #2: two LEAF elements that each render their own text and
  // whose boxes substantially overlap. #2 only fires on the exact-same-point
  // signature of a lost containing block; this catches a caption sliding under
  // a photograph, a heading colliding with a badge, and every other partial
  // overlap — the class of defect that neither overflow nor axe can see.
  // Two whole classes of box report a rect that is not where the text is, and
  // both produced false positives that drowned the real findings:
  //
  //  - An INLINE element that wraps across lines reports the UNION of its line
  //    boxes. Two <strong>s on different lines of the same paragraph therefore
  //    both report a full-width box and read as 100% overlapped. Every
  //    "collision" on /privacy and /terms was this.
  //  - A ROTATED element reports its axis-aligned BOUNDING box. The fanned
  //    cards in VerifiedSpotlight are rotated by design, which inflates a
  //    17px heading's box to 46px and makes it overlap its own subtitle.
  //    `brokenAspect` below already skips transformed boxes for the same reason.
  const rotated = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if ((cs.transform && cs.transform !== 'none') || (cs.rotate && cs.rotate !== 'none')) return true;
    }
    return false;
  };
  const leaves = all.filter((el) => {
    if (!seen(el)) return false;
    // own text, not merely inherited from descendants
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) return false;
    if (getComputedStyle(el).display === 'inline') return false;
    if (rotated(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  });
  const collisions = [];
  for (let i = 0; i < leaves.length && collisions.length < 8; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox <= 1 || oy <= 1) continue;
      const area = ox * oy;
      const frac = area / Math.min(ra.width * ra.height, rb.width * rb.height);
      if (frac < 0.55) continue;
      // A deliberate overlay (a caption on a scrim over a photo) puts the two
      // in the same stacking context with different z — that is design. Two
      // texts in normal flow on top of each other is not.
      collisions.push({
        a: ident(a), b: ident(b),
        aText: (a.textContent || '').trim().slice(0, 30),
        bText: (b.textContent || '').trim().slice(0, 30),
        overlap: Math.round(frac * 100),
        at: `${Math.round(ra.x)},${Math.round(ra.y)}`,
      });
      if (collisions.length >= 8) break;
    }
  }

  // --- 4. aspect-ratio boxes forced out of shape -------------------------
  const brokenAspect = all.map((el) => {
    const cs = getComputedStyle(el);
    const ar = cs.aspectRatio;
    if (!ar || ar === 'auto') return null;
    if (cs.transform && cs.transform !== 'none') return null;
    if (cs.rotate && cs.rotate !== 'none') return null;
    if (cs.scale && cs.scale !== 'none' && cs.scale !== '1') return null;
    const m = ar.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
    const ratio = m ? Number(m[1]) / Number(m[2]) : Number(ar);
    if (!ratio || !isFinite(ratio)) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    const expected = r.width / ratio;
    const off = r.height - expected;
    if (Math.abs(off) <= 2) return null;
    return { sel: ident(el), declared: ar, box: `${Math.round(r.width)}x${Math.round(r.height)}`, offBy: Math.round(off) };
  }).filter(Boolean).slice(0, 6);

  // --- 5. tap targets under the WCAG 2.2 (2.5.8) 24px floor --------------
  const smallTargets = [...document.querySelectorAll('a,button,[role="button"],input,select,summary')]
    .filter((el) => el.getAttribute('tabindex') !== '-1' && !el.closest('[aria-hidden="true"]') && seen(el))
    // WCAG 2.5.8 exempts a target that is "in a sentence" — an inline link in
    // running prose, whose size is set by the type around it and cannot be
    // grown without breaking the paragraph. axe applies the same exception;
    // this check did not, and reported the word "top" inside an editorial
    // article as a failure.
    .filter((el) => getComputedStyle(el).display !== 'inline')
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24))
    .slice(0, 10)
    .map(({ el, r }) => ({ sel: ident(el), text: (el.textContent || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }));

  // --- 6. images that did not render -------------------------------------
  // A broken product photograph is invisible to every other check here: the
  // card still lays out, still has its caption, still passes axe. The alt text
  // just quietly replaces the picture.
  const brokenImages = [...document.querySelectorAll('img')]
    .filter((im) => im.complete && im.naturalWidth === 0)
    .slice(0, 10)
    .map((im) => ({ src: (im.currentSrc || im.src || '').slice(-90), alt: (im.alt || '').slice(0, 40) }));
  // An <img> whose intrinsic aspect is squashed by explicit w/h without
  // object-fit renders a distorted person. Report the ones that are badly off.
  const squashedImages = [...document.querySelectorAll('img')]
    .filter((im) => im.naturalWidth > 0 && seen(im))
    .map((im) => {
      const r = im.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) return null;
      const fit = getComputedStyle(im).objectFit;
      if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') return null;
      const natural = im.naturalWidth / im.naturalHeight;
      const shown = r.width / r.height;
      const skew = shown / natural;
      if (skew > 0.9 && skew < 1.1) return null;
      return { src: (im.currentSrc || im.src).slice(-70), natural: natural.toFixed(2), shown: shown.toFixed(2), box: `${Math.round(r.width)}x${Math.round(r.height)}` };
    }).filter(Boolean).slice(0, 6);

  // --- 7. text too small to read ----------------------------------------
  const tinyText = [];
  const tinySeen = new Set();
  for (const el of all) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !seen(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs >= 10) continue;
    const k = ident(el);
    if (tinySeen.has(k)) continue;
    tinySeen.add(k);
    tinyText.push({ sel: k, px: fs, text: (el.textContent || '').trim().slice(0, 28) });
    if (tinyText.length >= 8) break;
  }

  // --- 8. content clipped by an overflow:hidden ancestor ------------------
  // Excludes the legitimate cases: a line-clamp, an ellipsis, and anything
  // inside a deliberate scroll rail.
  const clipped = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== 'hidden' && cs.overflowY !== 'hidden') continue;
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') continue;
    // .sr-only is a 1px clipped box BY DESIGN — it is how a label is given to a
    // screen reader without drawing it. Reporting it trains the reader to skim
    // this list, which is how a real clipped heading gets missed.
    if (el.classList.contains('sr-only') || (cs.clipPath && cs.clipPath !== 'none') || cs.clip !== 'auto') continue;
    const t = (el.textContent || '').trim();
    if (!t) continue;
    if (el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0) {
      clipped.push({ sel: ident(el), clientH: el.clientHeight, scrollH: el.scrollHeight, text: t.slice(0, 34) });
    }
    if (clipped.length >= 6) break;
  }

  // --- 9. is anything actually on the page -------------------------------
  const main = document.querySelector('main') || document.body;
  const cards = document.querySelectorAll('a[href^="http"]').length;

  return {
    vw, vh,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    overflows: document.documentElement.scrollWidth > vw + 1,
    offenders: offenders.slice(0, 8),
    stackedText, collisions, brokenAspect, smallTargets,
    brokenImages, squashedImages, tinyText, clipped,
    imgCount: document.querySelectorAll('img').length,
    textLen: (main.innerText || '').trim().length,
    outboundLinks: cards,
    h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim().slice(0, 60)),
  };
};

const tasks = [];
for (const engineName of engineNames) {
  const vps = engineName === 'webkit'
    ? viewportNames.filter((v) => WEBKIT_VIEWPORTS.includes(v))
    : viewportNames;
  for (const vpName of vps) for (const route of routes) tasks.push({ engineName, vpName, route });
}

const report = [];
let done = 0;

for (const engineName of engineNames) {
  const mine = tasks.filter((t) => t.engineName === engineName);
  if (!mine.length) continue;
  const browser = await ENGINES[engineName].launch();

  const worker = async (queue) => {
    for (;;) {
      const task = queue.shift();
      if (!task) return;
      const vp = ALL_VIEWPORTS[task.vpName];
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: engineName === 'chromium' ? !!vp.isMobile : undefined,
        hasTouch: !!vp.isMobile,
        bypassCSP: LOCAL,
      });
      // WEBKIT ONLY, and local http only. Strips HSTS + upgrade-insecure-requests
      // for the TEST CLIENT: both are correct in production, but over plain http
      // WebKit honours them, rewrites every subresource to https, fails TLS and
      // renders with no CSS at all.
      //
      // Chromium exempts localhost from both, so it never needed this — and
      // routing every request through `route.fetch()` there was actively harmful:
      // under five parallel contexts some fetches lost the race and were aborted,
      // which left product photographs and Style-It cutouts BLANK in the
      // screenshots. Two of those blanks were investigated as site defects before
      // the harness turned out to be the cause.
      if (LOCAL && engineName === 'webkit') {
        await context.route('**/*', async (r) => {
          const url = r.request().url().replace(/^https:\/\/localhost:/, 'http://localhost:');
          try {
            const res = await r.fetch({ url });
            const headers = { ...res.headers() };
            delete headers['strict-transport-security'];
            if (headers['content-security-policy']) {
              headers['content-security-policy'] = headers['content-security-policy'].replace('upgrade-insecure-requests', '');
            }
            await r.fulfill({ response: res, headers });
          } catch {
            // Both arms can legitimately throw once the page has moved on: the
            // route is already handled, or the context is closing. Neither is a
            // finding about the SITE, and an unhandled rejection here takes the
            // whole run down — which it did, at 77 of 312 pages, with no report
            // written for the 77 that had completed.
            try { await r.abort(); } catch { /* already handled or context gone */ }
          }
        });
      }
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 140)); });
      page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR ${e.message.slice(0, 140)}`));
      page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().slice(-80)}`); });

      const id = `${task.route === '/' ? 'home' : task.route.replace(/\//g, '-').replace(/^-/, '')}__${task.vpName}__${engineName}`;
      const row = { engine: engineName, viewport: task.vpName, tier: vp.tier, route: task.route, id };
      try {
        const res = await page.goto(`${BASE}${task.route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        row.status = res?.status();
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        // Lazy images below the fold never load unless something scrolls, and a
        // full-page screenshot of unloaded images is a picture of the bug we are
        // not looking for. Scroll to the bottom, then back to the top.
        await page.evaluate(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 250));
        });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

        const css = await page.evaluate(CSS_PROOF);
        row.css = css;
        if (!css.ok) row.INVALID = 'stylesheet did not load — every measurement below is meaningless';

        Object.assign(row, await page.evaluate(MEASURE));

        try {
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          row.violations = axe.violations.map((v) => ({
            id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help,
            sample: v.nodes[0]?.html?.slice(0, 110), target: v.nodes[0]?.target?.join(' '),
          }));
        } catch (e) { row.axeError = e.message.split('\n')[0]; }

        await page.screenshot({ path: new URL(`${id}.png`, OUT).pathname, fullPage: false });
        try {
          await page.screenshot({ path: new URL(`${id}-full.png`, OUT).pathname, fullPage: true });
        } catch (e) { row.fullShotError = e.message.split('\n')[0]; }
      } catch (e) {
        row.error = e.message.split('\n')[0];
      }
      row.consoleErrors = [...new Set(consoleErrors)].slice(0, 6);
      row.failedRequests = [...new Set(failedRequests)].slice(0, 6);
      report.push(row);
      await context.close();
      done++;
      process.stdout.write(`\r  ${done}/${tasks.length}  ${id.padEnd(52).slice(0, 52)}`);
    }
  };

  const queue = [...mine];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  await browser.close();
}

process.stdout.write('\n');
writeFileSync(new URL('report.json', OUT), JSON.stringify(report, null, 2));

// ---- summary ---------------------------------------------------------------
const problem = (r) =>
  r.error || r.INVALID || r.overflows || (r.stackedText?.length) || (r.collisions?.length) ||
  (r.brokenAspect?.length) || (r.smallTargets?.length) || (r.brokenImages?.length) ||
  (r.squashedImages?.length) || (r.tinyText?.length) || (r.clipped?.length) ||
  (r.violations?.length) || (r.consoleErrors?.length) || (r.failedRequests?.length) ||
  (r.status && r.status >= 400);

console.log(`\nVISUAL AUDIT — ${BASE}\n${'='.repeat(72)}`);
for (const r of report.filter(problem).sort((a, b) => (a.route + a.viewport).localeCompare(b.route + b.viewport))) {
  console.log(`\n${r.route}  [${r.viewport} · ${r.engine}]  ${r.status ?? '—'}`);
  if (r.error) console.log(`   FAILED: ${r.error}`);
  if (r.INVALID) console.log(`   INVALID: ${r.INVALID} (body bg ${r.css?.bg}, font ${r.css?.ff})`);
  if (r.overflows) console.log(`   OVERFLOW: scrollWidth ${r.scrollWidth} > ${r.vw}`);
  for (const o of r.offenders || []) console.log(`      ↳ ${o.sel} left=${o.left} right=${o.right} w=${o.width}`);
  for (const s of r.stackedText || []) console.log(`   STACKED TEXT @${s.at}: ${s.texts.join(' | ')}`);
  for (const c of r.collisions || []) console.log(`   COLLISION ${c.overlap}% @${c.at}: "${c.aText}" (${c.a}) over "${c.bText}" (${c.b})`);
  for (const a of r.brokenAspect || []) console.log(`   ASPECT ${a.sel} declared ${a.declared} box ${a.box} off ${a.offBy}px`);
  for (const t of r.smallTargets || []) console.log(`   TAP ${t.w}x${t.h} ${t.sel} "${t.text}"`);
  for (const b of r.brokenImages || []) console.log(`   BROKEN IMG …${b.src}  alt="${b.alt}"`);
  for (const s of r.squashedImages || []) console.log(`   SQUASHED IMG …${s.src} natural ${s.natural} shown ${s.shown} (${s.box})`);
  for (const t of r.tinyText || []) console.log(`   TINY ${t.px}px ${t.sel} "${t.text}"`);
  for (const c of r.clipped || []) console.log(`   CLIPPED ${c.sel} ${c.clientH}<${c.scrollH} "${c.text}"`);
  for (const v of r.violations || []) console.log(`   a11y [${v.impact}] ${v.id} x${v.nodes} — ${v.help}  ${v.target ?? ''}`);
  for (const c of r.consoleErrors || []) console.log(`   CONSOLE ${c}`);
  for (const f of r.failedRequests || []) console.log(`   REQUEST ${f}`);
}

console.log(`\n${'='.repeat(72)}\nTOTALS`);
const tally = {};
for (const r of report) {
  const k = `${r.engine}/${r.tier}`;
  const t = (tally[k] ??= { pages: 0, overflow: 0, collide: 0, aspect: 0, tap: 0, img: 0, a11y: 0, err: 0, invalid: 0 });
  t.pages++;
  if (r.overflows) t.overflow++;
  t.collide += (r.collisions?.length || 0) + (r.stackedText?.length || 0);
  t.aspect += r.brokenAspect?.length || 0;
  t.tap += r.smallTargets?.length || 0;
  t.img += (r.brokenImages?.length || 0) + (r.squashedImages?.length || 0);
  t.a11y += r.violations?.length || 0;
  if (r.error) t.err++;
  if (r.INVALID) t.invalid++;
}
for (const [k, t] of Object.entries(tally)) {
  console.log(`${k.padEnd(20)} pages ${String(t.pages).padStart(3)} | overflow ${t.overflow} | overlap ${t.collide} | aspect ${t.aspect} | tap ${t.tap} | img ${t.img} | a11y ${t.a11y} | errors ${t.err} | no-css ${t.invalid}`);
}
console.log(`\nscreenshots + report.json in .audit/visual/`);
