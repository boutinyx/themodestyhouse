// Does the /about "how it works" disclosure actually OPEN — by mouse, by touch
// and by keyboard, in both engines?
//
// Nothing in a static render can answer that. CLAUDE.md §10.25: a control whose
// open state comes only from :hover is not operable by touch, and the filter
// dropdowns were broken on every Apple device for as long as they existed
// because no check ever performed the interaction.
//
//   npm run build && npx next start -p 3189
//   BASE=http://localhost:3189 node scripts/reveal-audit.mjs
//
// This script found two real defects the day it was written, both invisible to
// the visual audit and each visible in only ONE engine:
//   - a touch tap fired pointerenter:touch (open) then click (toggle) and the
//     block shut again  -> fixed by gating hover on pointerType === 'mouse'
//   - Chromium's emulated tap MOVES FOCUS to the button, so onFocus opened it
//     and the click closed it -> fixed by deleting onFocus entirely
//
// It asserts the CLOSED state as well as the open one. That is the negative
// control (§10.28 #1): if the assertion could not tell them apart it would
// report the same value twice, and a check that cannot fail is not a check.

import { chromium, webkit } from 'playwright';
const URL = (process.env.BASE || 'http://localhost:3189') + '/about';

const STATE = `(() => {
  const btn=[...document.querySelectorAll('button[aria-controls^="how-body-"]')][0];
  const body=document.getElementById(btn.getAttribute('aria-controls'));
  return { exp: btn.getAttribute('aria-expanded'),
           vis: getComputedStyle(body.firstElementChild).visibility,
           h: Math.round(body.getBoundingClientRect().height) };
})()`;

async function run(name, engine, vp, mode) {
  const b = await engine.launch();
  const ctx = await b.newContext({ viewport: vp, hasTouch: mode==='touch', isMobile: mode==='touch' });
  // WEBKIT ONLY, local http only. The site sends HSTS + upgrade-insecure-requests;
  // over plain-http localhost WebKit honours both, rewrites every subresource to
  // https, TLS fails, and NO JAVASCRIPT LOADS — so every interaction "fails"
  // against a page that was never interactive. CLAUDE.md §10.24 / §10.26.
  if (engine === webkit) {
    await ctx.route('**/*', async (r) => {
      try { const res = await r.fetch();
        const h = { ...res.headers() }; delete h['strict-transport-security'];
        if (h['content-security-policy']) h['content-security-policy'] =
          h['content-security-policy'].replace('upgrade-insecure-requests','');
        await r.fulfill({ response: res, headers: h });
      } catch { try { await r.continue(); } catch {} }
    });
  }
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  // §10.28 #2 — an interaction result is void unless the page is INTERACTIVE.
  // The button is in the SSR html, so its presence proves nothing; wait for React.
  const hydrated = await p.waitForFunction(
    `!!(window.next || document.querySelector('[data-hydrated]'))`, null, { timeout: 15000 }
  ).then(()=>true).catch(()=>false);
  await p.waitForTimeout(500);

  const before = await p.evaluate(STATE);
  const btn = p.locator('button[aria-controls^="how-body-"]').first();
  await btn.scrollIntoViewIfNeeded();
  if (mode === 'touch')      await btn.tap();
  else if (mode === 'hover') await btn.hover();
  else { await btn.focus(); await p.keyboard.press('Enter'); }
  await p.waitForTimeout(500);
  const after = await p.evaluate(STATE);

  const ok = hydrated && before.vis==='hidden' && before.exp==='false'
          && after.vis==='visible' && after.exp==='true' && after.h > 20;
  console.log(`${ok?'PASS':'**FAIL**'}  ${name.padEnd(28)} hydrated=${hydrated} before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
  await b.close(); return ok;
}

const r=[];
r.push(await run('webkit iPhone390 TAP',  webkit,   {width:390,height:844},  'touch'));
r.push(await run('webkit iPad1366 TAP',   webkit,   {width:1366,height:1024},'touch'));
r.push(await run('chromium 390 TAP',      chromium, {width:390,height:844},  'touch'));
r.push(await run('chromium 1440 HOVER',   chromium, {width:1440,height:900}, 'hover'));
r.push(await run('webkit 1440 HOVER',     webkit,   {width:1440,height:900}, 'hover'));
r.push(await run('chromium 1440 KEYBOARD',chromium, {width:1440,height:900}, 'kbd'));
r.push(await run('webkit 1440 KEYBOARD',  webkit,   {width:1440,height:900}, 'kbd'));
const allOk = r.every(Boolean);
console.log(allOk ? '\nALL PASS' : '\nSOME FAILED');
process.exit(allOk ? 0 : 1);
