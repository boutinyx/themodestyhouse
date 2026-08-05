import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import { assertLocalDev, sentinelPresent, onManagedPlatform } from '@/lib/devOnly';
import nextConfig from '@/next.config';
import { config as proxyConfig } from '@/proxy';

const ROOT = path.join(__dirname, '..');

/**
 * These tests prove the /admin/curate + /api/curate gate. They are all
 * deterministic and filesystem-only, so they pass on a clean CI checkout where
 * data/raw-products.json is absent.
 */

describe('layer 1 — build-time route exclusion (next.config.ts)', () => {
  it('registers dev-only page extensions ONLY for the dev server phase', () => {
    const dev = nextConfig(PHASE_DEVELOPMENT_SERVER).pageExtensions ?? [];
    expect(dev).toContain('dev.tsx');
    expect(dev).toContain('dev.ts');
    // The owner must still be able to use /admin/curate under `npm run dev`.
    expect(dev).toContain('tsx');
  });

  it('excludes dev-only page extensions in a production build', () => {
    const prod = nextConfig(PHASE_PRODUCTION_BUILD).pageExtensions ?? [];
    expect(prod).toEqual(['ts', 'tsx', 'js', 'jsx']);
    expect(prod.some((e) => e.startsWith('dev.'))).toBe(false);
  });

  it('gates on build PHASE, not on NODE_ENV', () => {
    // The whole point: NODE_ENV is settable from a deploy platform's project
    // settings; the phase argument is not. Even with NODE_ENV=development, a
    // production-build phase must not register the dev extensions.
    const prev = process.env.NODE_ENV;
    try {
      // @ts-expect-error - NODE_ENV is typed readonly-ish; we are simulating.
      process.env.NODE_ENV = 'production';
      const prod = nextConfig(PHASE_PRODUCTION_BUILD).pageExtensions ?? [];
      expect(prod.some((e) => e.startsWith('dev.'))).toBe(false);
    } finally {
      // @ts-expect-error - restore
      process.env.NODE_ENV = prev;
    }
  });

  it('TRIPWIRE: refuses to build at all when NODE_ENV=development', () => {
    const prev = process.env.NODE_ENV;
    try {
      // @ts-expect-error - simulating a hostile/mistaken deploy config
      process.env.NODE_ENV = 'development';
      expect(() => nextConfig(PHASE_PRODUCTION_BUILD)).toThrow(
        /Refusing to build with NODE_ENV=development/,
      );
    } finally {
      // @ts-expect-error - restore
      process.env.NODE_ENV = prev;
    }
  });

  it('still allows the dev server when NODE_ENV=development', () => {
    const prev = process.env.NODE_ENV;
    try {
      // @ts-expect-error - simulating `next dev`
      process.env.NODE_ENV = 'development';
      expect(() => nextConfig(PHASE_DEVELOPMENT_SERVER)).not.toThrow();
    } finally {
      // @ts-expect-error - restore
      process.env.NODE_ENV = prev;
    }
  });
});

describe('layer 1 — no ungated route file may exist on the guarded prefixes', () => {
  // This is the regression test for the real failure mode: a merge conflict,
  // a revert, or a new contributor creating app/api/curate/route.ts alongside
  // route.dev.ts. That would silently reship the endpoint.
  const GUARDED_DIRS = ['app/admin', 'app/api/curate'];

  function walk(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) return [];
    const out: string[] = [];
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(rel));
      else out.push(rel);
    }
    return out;
  }

  it('has no page.* or route.* without the .dev. marker under guarded dirs', () => {
    const offenders = GUARDED_DIRS.flatMap(walk).filter((f) =>
      /(^|[/\\])(page|route)\.(ts|tsx|js|jsx)$/.test(f),
    );
    expect(offenders).toEqual([]);
  });

  it('the curation tooling still exists, as .dev. files', () => {
    for (const f of [
      'app/admin/curate/page.dev.tsx',
      'app/admin/curate/CurateClient.dev.tsx',
      'app/api/curate/route.dev.ts',
      'app/api/curate/list/route.dev.ts',
    ]) {
      expect(existsSync(path.join(ROOT, f)), `${f} missing`).toBe(true);
    }
  });

  it('no client component under app/admin is shippable without the .dev. marker', () => {
    // pageExtensions does not gate non-route files. If a plain .tsx component
    // under app/admin is ever imported by a built page, its chunk is served
    // from /_next/static, which no proxy matcher covers.
    const shippable = walk('app/admin').filter(
      (f) => /\.(tsx|ts)$/.test(f) && !/\.dev\.(tsx|ts)$/.test(f),
    );
    expect(shippable).toEqual([]);
  });
});

describe('layer 2 — proxy matcher coverage (proxy.ts)', () => {
  // Compile the matchers with Next's own compiler so this test tracks reality
  // rather than a hand-written approximation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMiddlewareMatchers } = require('next/dist/build/analysis/get-page-static-info.js');
  const regexes: RegExp[] = getMiddlewareMatchers(proxyConfig.matcher, {}).map(
    (m: { regexp: string }) => new RegExp(m.regexp),
  );
  const covered = (p: string) => regexes.some((r) => r.test(p));

  it.each([
    '/admin',
    '/admin/curate',
    '/api/curate',
    '/api/curate/list',
    // Adjacent-prefix siblings. A segment matcher ('/api/curate/:path*' or
    // '/api/curate:path*' — they compile to the SAME regex) does NOT cover
    // these. The custom-regex param in proxy.ts is what closes the hole.
    '/api/curate-export',
    '/api/curateexport',
    '/api/decisions',
    '/api/decisions-dump',
    '/api/raw',
    '/api/admin/anything',
  ])('blocks %s', (p) => {
    expect(covered(p)).toBe(true);
  });

  it.each(['/', '/directory', '/api/csp-report', '/editorial/x', '/api/other'])(
    'does NOT block %s',
    (p) => {
      expect(covered(p)).toBe(false);
    },
  );
});

describe('layer 4 — data-layer sentinel guard (lib/rawData.ts)', () => {
  it('throws when the local-only sentinel file is absent (i.e. in a deployment)', () => {
    expect(() => assertLocalDev('/definitely/not/a/real/path.json')).toThrow(
      'Not available',
    );
  });

  it('does not throw when the sentinel is present (i.e. a local checkout)', () => {
    // Use this test file itself as a stand-in for a present sentinel, so the
    // test does not depend on data/raw-products.json existing.
    expect(() => assertLocalDev(__filename)).not.toThrow();
  });

  it('sentinel is independent of NODE_ENV', () => {
    const prev = process.env.NODE_ENV;
    try {
      // @ts-expect-error - the bypass we are defending against
      process.env.NODE_ENV = 'development';
      expect(() => assertLocalDev('/definitely/not/a/real/path.json')).toThrow();
      expect(sentinelPresent('/definitely/not/a/real/path.json')).toBe(false);
    } finally {
      // @ts-expect-error - restore
      process.env.NODE_ENV = prev;
    }
  });

  it('every rawData export asserts the guard', () => {
    const src = readFileSync(path.join(ROOT, 'lib/rawData.ts'), 'utf8');
    const exported = [...src.matchAll(/export function (\w+)/g)].map((m) => m[1]);
    expect(exported.length).toBeGreaterThan(0);
    for (const fn of exported) {
      const body = src.slice(src.indexOf(`export function ${fn}`));
      const end = body.indexOf('\n}');
      expect(
        body.slice(0, end).includes('assertLocalDev()'),
        `${fn}() does not call assertLocalDev()`,
      ).toBe(true);
    }
  });
});

describe('platform detection (host is Railway, not Vercel)', () => {
  it('treats Railway env markers as "not a laptop"', () => {
    // Regression: IS_LOCAL_DEV used to check only process.env.VERCEL. On Railway
    // that check is inert, so deploying with NODE_ENV=development had NO backstop
    // at this layer. Each marker below must independently close the gate.
    for (const k of ['RAILWAY_ENVIRONMENT', 'RAILWAY_PROJECT_ID', 'RAILWAY_SERVICE_ID']) {
      expect(onManagedPlatform({ [k]: 'production' }), k).toBe(true);
    }
  });

  it('still recognises other managed platforms', () => {
    expect(onManagedPlatform({ VERCEL: '1' })).toBe(true);
    expect(onManagedPlatform({ RENDER: 'true' })).toBe(true);
  });

  it('a bare developer machine is not a managed platform', () => {
    expect(onManagedPlatform({ HOME: '/Users/tina', PATH: '/usr/bin' })).toBe(false);
  });

  it('ignores an empty-string marker rather than treating it as set', () => {
    expect(onManagedPlatform({ RAILWAY_ENVIRONMENT: '' })).toBe(false);
  });
});
