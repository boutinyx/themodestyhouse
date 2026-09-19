import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { collectSlugs, pathsToRevalidate, verifySignature } from './ghostWebhook';

const SECRET = 'topsecret';
const NOW = 1_800_000_000_000;
const sign = (body: string, t: number, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(body + String(t)).digest('hex')}, t=${t}`;

describe('verifySignature', () => {
  const body = JSON.stringify({ post: { current: { slug: 'a' } } });

  it('accepts a correct signature', () => {
    expect(verifySignature(body, sign(body, NOW), SECRET, NOW)).toBe(true);
  });

  it('rejects a wrong secret, a tampered body, a missing header and an unset secret alike', () => {
    expect(verifySignature(body, sign(body, NOW, 'other'), SECRET, NOW)).toBe(false);
    expect(verifySignature(body + ' ', sign(body, NOW), SECRET, NOW)).toBe(false);
    expect(verifySignature(body, null, SECRET, NOW)).toBe(false);
    expect(verifySignature(body, sign(body, NOW), undefined, NOW)).toBe(false);
    expect(verifySignature(body, sign(body, NOW), '', NOW)).toBe(false);
  });

  it('rejects a malformed header', () => {
    expect(verifySignature(body, 'garbage', SECRET, NOW)).toBe(false);
    expect(verifySignature(body, 'sha256=abc', SECRET, NOW)).toBe(false);
    expect(verifySignature(body, `sha256=${'0'.repeat(64)}, t=notanumber`, SECRET, NOW)).toBe(false);
  });

  it('rejects a replay older than five minutes and one from the future', () => {
    const old = NOW - 5 * 60_000 - 1;
    expect(verifySignature(body, sign(body, old), SECRET, NOW)).toBe(false);
    expect(verifySignature(body, sign(body, NOW - 4 * 60_000), SECRET, NOW)).toBe(true);
    expect(verifySignature(body, sign(body, NOW + 5 * 60_000 + 1), SECRET, NOW)).toBe(false);
  });
});

describe('collectSlugs', () => {
  it('returns the current slug', () => {
    expect(collectSlugs({ post: { current: { slug: 'a' }, previous: {} } })).toEqual(['a']);
  });

  it('returns both slugs on a rename', () => {
    expect(collectSlugs({ post: { current: { slug: 'new' }, previous: { slug: 'old' } } }).sort()).toEqual([
      'new',
      'old',
    ]);
  });

  it('still yields the previous slug on a delete, where current is empty', () => {
    expect(collectSlugs({ post: { current: {}, previous: { slug: 'gone' } } })).toEqual(['gone']);
  });

  it('is empty for anything that is not a post payload', () => {
    expect(collectSlugs(null)).toEqual([]);
    expect(collectSlugs({})).toEqual([]);
    expect(collectSlugs({ post: { current: { slug: 42 } } })).toEqual([]);
  });
});

describe('pathsToRevalidate', () => {
  it('covers the home page, the index, each slug and the three text routes', () => {
    expect(pathsToRevalidate(['a', 'b'])).toEqual([
      '/',
      '/editorial',
      '/editorial/a',
      '/editorial/b',
      '/sitemap.xml',
      '/llms.txt',
      '/llms-full.txt',
      '/index.md',
    ]);
  });

  it('does not build a path from a slug that could escape the section', () => {
    expect(pathsToRevalidate(['../admin', 'a/b', 'ok'])).toEqual([
      '/',
      '/editorial',
      '/editorial/ok',
      '/sitemap.xml',
      '/llms.txt',
      '/llms-full.txt',
      '/index.md',
    ]);
  });
});
