import { describe, it, expect } from 'vitest';
import { buildCustomRoute } from 'next/dist/lib/build-custom-route';
import nextConfig from '../next.config';
import { PUBLIC_ASSET_CACHE_CONTROL } from './publicAssetCache';

// The rule is found by its VALUE, not by position or source, so reordering
// headers() cannot make this test pass against the wrong entry.
async function assetRule() {
  const headers = await nextConfig('phase-production-build').headers!();
  const rule = headers.find((r) =>
    r.headers.some((h) => h.key === 'Cache-Control' && h.value === PUBLIC_ASSET_CACHE_CONTROL),
  );
  expect(rule, 'no public-asset Cache-Control rule in next.config.ts').toBeDefined();
  return rule!;
}

// Compiled through Next's own buildCustomRoute — the function that turns a
// `source` into the regex in routes-manifest.json — so this asserts what the
// server will actually match, not what path-to-regexp syntax looks like.
async function matcher() {
  const { regex } = buildCustomRoute('header', await assetRule());
  const re = new RegExp(regex);
  return (path: string) => re.test(path);
}

describe('public/ photographs are cacheable at the Cloudflare edge', () => {
  it('next.config.ts sends the asset Cache-Control', async () => {
    await assetRule();
  });

  // Each of these switches Cloudflare's asynchronous stale-while-revalidate
  // off (developers.cloudflare.com/cache/concepts/revalidation), which would put
  // a visitor back behind an origin round trip — the bug this rule exists to fix.
  it('never tells a shared cache to revalidate before serving', () => {
    expect(PUBLIC_ASSET_CACHE_CONTROL).toMatch(/(^|, )public(,|$)/);
    expect(PUBLIC_ASSET_CACHE_CONTROL).toMatch(/\bmax-age=[1-9]\d*/);
    expect(PUBLIC_ASSET_CACHE_CONTROL).toMatch(/\bstale-while-revalidate=[1-9]\d*/);
    expect(PUBLIC_ASSET_CACHE_CONTROL).not.toMatch(
      /s-maxage|must-revalidate|proxy-revalidate|no-cache|no-store|private|max-age=0\b/,
    );
  });

  it('matches the photographs and video the pages serve', async () => {
    const match = await matcher();
    for (const p of [
      '/edit-lace-hero-v2-3200.webp',
      '/edit-jersey-hero.jpg',
      '/edit-fall-hero-mobile-7-1170.webp',
      '/hero-home-mobile-1290.webp',
      '/editorial/street-jewelry-400.webp',
      '/style-it/top_11.png',
      '/brand-mark.svg',
      '/hero-gen/museum/episode-1.mp4',
      '/photo.jpeg',
    ]) {
      expect(match(p), p).toBe(true);
    }
  });

  // A page, a feed and a build asset must each keep the cache policy they have
  // today: pages are governed by the Cloudflare cache rules, the sitemap and
  // the Meta catalogue feed must never be held stale, and /_next/static is
  // already immutable (Next overrides any config header there anyway).
  it('never matches a page, a feed, or a build asset', async () => {
    const match = await matcher();
    for (const p of [
      '/',
      '/modest-abayas',
      '/edits/everyday-lace',
      '/sitemap.xml',
      '/robots.txt',
      '/llms.txt',
      '/llms-full.txt',
      '/meta-catalogue.xml',
      '/favicon.ico',
      '/api/contact',
      '/_next/static/media/abc123.png',
      '/_next/static/chunks/abc123.js',
      '/hero-gen/museum/prompts/episode-1.json',
      '/about-layouts.html',
    ]) {
      expect(match(p), p).toBe(false);
    }
  });
});
