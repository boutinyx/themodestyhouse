#!/usr/bin/env node
/**
 * VERIFY the redirect-only Ghost theme (ghost-theme/) on the live Ghost origin.
 *
 *   GHOST_URL=https://cms.themodestyhouse.com GHOST_ADMIN_KEY=<id>:<secret> \
 *     node scripts/ghost-theme.mjs
 *
 * Ghost is headless here: no visitor should ever see a Ghost-rendered page, and none of its
 * pages may be indexed (the site would compete with itself for every post). This ASSERTS the
 * noindex and the redirect on the Ghost origin, rather than trusting that an upload worked.
 * Any failure exits non-zero.
 *
 * IT DOES NOT UPLOAD. The design assumed the Admin API could (`POST /themes/upload/`), and it
 * cannot: an integration's Admin key is refused with 403 "API tokens do not have permission to
 * access this endpoint" for themes, settings, routes, users and invites (measured 2026-09-19).
 * Those need a STAFF session, i.e. the logged-in Ghost admin. To (re)install the theme, zip
 * ghost-theme/ WITHOUT routes.yaml, upload it under Settings -> Theme, activate it, and upload
 * routes.yaml under Settings -> Labs. docs/log/2026-09-19-ghost-cms.md records what was done.
 *
 * NOTE: robots.txt in the theme is cached for a YEAR by Ghost's static theme handler. It is
 * verified live here and should not be edited casually.
 */
import { admin, ghostEnv } from './lib/ghostAdmin.mjs';

const SITE = 'https://themodestyhouse.com';
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok      ' : 'FAIL    '}${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

const { url } = ghostEnv();

// --- verify on the live origin ---
const get = async (path) => {
  const res = await fetch(url + path, { redirect: 'manual' });
  return { status: res.status, text: await res.text() };
};

const robots = await get('/robots.txt');
check('robots.txt disallows everything', /Disallow:\s*\/\s*$/m.test(robots.text), `status ${robots.status}`);

const home = await get('/');
check('/ carries noindex', /name="robots"[^>]*noindex/.test(home.text), `status ${home.status}`);
check('/ redirects to the site', home.text.includes(`location.replace("${SITE}/")`));

const posts = await admin('GET', 'posts/?limit=1&fields=slug&filter=status:published');
const slug = posts.posts?.[0]?.slug;
if (slug) {
  const post = await get(`/${slug}/`);
  check(`/${slug}/ carries noindex`, /name="robots"[^>]*noindex/.test(post.text), `status ${post.status}`);
  check(`/${slug}/ redirects to the editorial page`, post.text.includes(`location.replace("${SITE}/editorial/${slug}")`));
} else {
  // A skipped check is a finding (§10.28 rule 3): say so, do not let it read as green.
  console.log('SKIPPED post-page check: no published post yet. Re-run after the import.');
}

const missing = await get('/definitely-not-a-page-xyz/');
check('a 404 carries noindex', /name="robots"[^>]*noindex/.test(missing.text), `status ${missing.status}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('\ntheme verified');
