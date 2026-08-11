#!/usr/bin/env node
/**
 * Post-build assertion: the local-only curation tooling must not be in the
 * deployed artifact.
 *
 * Run after `next build`. Reads the real build output rather than the source,
 * so it catches a Next upgrade changing the pageExtensions matcher, a merge
 * conflict reinstating app/api/curate/route.ts, or anyone widening
 * pageExtensions — none of which the unit tests can see.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, '.next');

let failed = false;
const fail = (msg) => {
  console.error(`  FAIL  ${msg}`);
  failed = true;
};
const pass = (msg) => console.log(`  ok    ${msg}`);

if (!existsSync(NEXT_DIR)) {
  console.error('No .next directory. Run `npm run build` first.');
  process.exit(1);
}

/* 1. No guarded route may appear in the app route manifest. ---------------- */
const manifestPath = path.join(NEXT_DIR, 'app-path-routes-manifest.json');
if (!existsSync(manifestPath)) {
  fail(`${manifestPath} missing — did the build actually complete?`);
} else {
  const routes = Object.values(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const leaked = routes.filter((r) =>
    /^\/(admin|api\/(curate|decisions|raw|admin))/.test(r),
  );
  if (leaked.length) fail(`LEAKED ROUTES in app-path-routes-manifest: ${leaked.join(', ')}`);
  else pass(`no guarded routes in app-path-routes-manifest (${routes.length} routes total)`);
}

/* 2. Same check against routes-manifest.json. ------------------------------ */
const rmPath = path.join(NEXT_DIR, 'routes-manifest.json');
if (existsSync(rmPath)) {
  const rm = JSON.parse(readFileSync(rmPath, 'utf8'));
  const pages = [
    ...(rm.staticRoutes ?? []).map((r) => r.page),
    ...(rm.dynamicRoutes ?? []).map((r) => r.page),
  ];
  const leaked = pages.filter((p) =>
    /^\/(admin|api\/(curate|decisions|raw|admin))/.test(p),
  );
  if (leaked.length) fail(`LEAKED ROUTES in routes-manifest: ${leaked.join(', ')}`);
  else pass('no guarded routes in routes-manifest');
}

/* 3. No curation source may appear in ANY emitted chunk, server or client. -- */
/*    Client chunks matter most: /_next/static is outside every proxy matcher. */
const NEEDLES = [
  'CurateClient',
  'Curate — tap', // literal UI copy from CurateClient.dev.tsx
  'raw-products.json',
  'saveDecision',
  'ReviewClient',
  'Garment review —', // literal UI copy from ReviewClient.dev.tsx
  'saveGarmentOverride',
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs|cjs|json|html|map|txt|rsc)$/.test(e.name)) out.push(p);
  }
  return out;
}

const scanDirs = [
  path.join(NEXT_DIR, 'server'),
  path.join(NEXT_DIR, 'static'),
];
const hits = [];
for (const dir of scanDirs) {
  for (const file of walk(dir)) {
    if (statSync(file).size > 40 * 1024 * 1024) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const needle of NEEDLES) {
      if (text.includes(needle)) hits.push(`${path.relative(ROOT, file)} contains "${needle}"`);
    }
  }
}
if (hits.length) {
  for (const h of hits.slice(0, 20)) fail(h);
  if (hits.length > 20) fail(`...and ${hits.length - 20} more`);
} else {
  pass('no curation source found in .next/server or .next/static');
}

/* 4. The proxy must be built, AND its compiled matchers must cover the ----- */
/*    guarded paths. Next 16 records proxy under                             */
/*    .next/server/functions-config-manifest.json -> functions["/_middleware"] */
/*    (middleware-manifest.json stays empty for a Node-runtime proxy).        */
/*                                                                            */
/*    Testing the COMPILED regexes from the build artifact is what makes this */
/*    meaningful: segment matchers like '/api/curate/:path*' silently miss    */
/*    siblings such as /api/curate-export, and '/api/curate:path*' compiles   */
/*    to the identical regex. Only the custom-regex form covers them.         */
const MUST_BLOCK = [
  '/admin',
  '/admin/curate',
  '/api/curate',
  '/api/curate/list',
  '/api/curate-export',
  '/api/decisions',
  '/api/raw',
  '/api/admin/anything',
];
const MUST_NOT_BLOCK = ['/', '/directory', '/api/csp-report', '/editorial/x'];

const fcm = path.join(NEXT_DIR, 'server', 'functions-config-manifest.json');
if (!existsSync(fcm)) {
  fail('server/functions-config-manifest.json missing — proxy.ts was not built');
} else {
  const cfg = JSON.parse(readFileSync(fcm, 'utf8'));
  const mw = cfg.functions?.['/_middleware'];
  if (!mw) {
    fail('no "/_middleware" entry in functions-config-manifest — proxy.ts was not built');
  } else {
    const regexes = (mw.matchers ?? []).map((m) => new RegExp(m.regexp));
    if (!regexes.length) {
      fail('proxy has no matchers');
    } else {
      const covered = (p) => regexes.some((r) => r.test(p));
      const uncovered = MUST_BLOCK.filter((p) => !covered(p));
      const overreach = MUST_NOT_BLOCK.filter((p) => covered(p));
      if (uncovered.length) fail(`proxy matcher does NOT cover: ${uncovered.join(', ')}`);
      if (overreach.length) fail(`proxy matcher unexpectedly covers: ${overreach.join(', ')}`);
      if (!uncovered.length && !overreach.length)
        pass(`proxy built (${mw.runtime}) and matchers cover all ${MUST_BLOCK.length} guarded paths`);
    }
  }
}

/* 5. The dev-only source files must still be present in the repo. ---------- */
/*    Otherwise this whole script passes trivially because someone deleted    */
/*    the tooling rather than gating it.                                      */
for (const f of [
  'app/admin/curate/page.dev.tsx',
  'app/admin/curate/CurateClient.dev.tsx',
  'app/api/curate/route.dev.ts',
  'app/api/curate/list/route.dev.ts',
]) {
  if (!existsSync(path.join(ROOT, f))) fail(`${f} is missing from the repo`);
}
if (!failed) pass('dev-only curation sources present in repo');

console.log(
  failed
    ? '\nGATE CHECK FAILED — local-only routes would be publicly deployed.\n'
    : '\nGATE CHECK PASSED\n',
);
process.exit(failed ? 1 : 0);
