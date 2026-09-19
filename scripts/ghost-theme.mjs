#!/usr/bin/env node
/**
 * Upload, activate and VERIFY the redirect-only Ghost theme (ghost-theme/).
 *
 *   GHOST_URL=https://cms.themodestyhouse.com GHOST_ADMIN_KEY=<id>:<secret> \
 *     node scripts/ghost-theme.mjs
 *
 * Ghost is headless here: no visitor should ever see a Ghost-rendered page, and none of its
 * pages may be indexed (the site would compete with itself for every post). So after upload
 * this fetches the Ghost origin and ASSERTS the noindex and the redirect, rather than trusting
 * that the upload worked. Any failure exits non-zero.
 *
 * NOTE: robots.txt in the theme is cached for a YEAR by Ghost's static theme handler. It is
 * verified live here once and should not be edited casually.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { admin, ghostEnv } from './lib/ghostAdmin.mjs';

const THEME = 'modesty-house-headless';
const SITE = 'https://themodestyhouse.com';
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok      ' : 'FAIL    '}${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

const { url } = ghostEnv();
const dir = mkdtempSync(join(tmpdir(), 'ghost-theme-'));
const zipPath = join(dir, `${THEME}.zip`);
execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: 'ghost-theme' });

const themeForm = new FormData();
themeForm.append('file', new Blob([readFileSync(zipPath)], { type: 'application/zip' }), `${THEME}.zip`);
await admin('POST', 'themes/upload/', { form: themeForm });
console.log('uploaded theme');
await admin('PUT', `themes/${THEME}/activate/`);
console.log('activated theme');

const routesForm = new FormData();
routesForm.append('routes', new Blob([readFileSync('ghost-theme/routes.yaml')], { type: 'text/yaml' }), 'routes.yaml');
await admin('POST', 'settings/routes/yaml', { form: routesForm });
console.log('uploaded routes.yaml');

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
