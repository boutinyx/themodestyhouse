import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { validateSubscribe, subscribeViaGhost } from './subscribe';

describe('validateSubscribe', () => {
  it('accepts a normal address', () => {
    const r = validateSubscribe({ email: '  tina@example.com ' });
    expect(r).toEqual({ ok: true, email: 'tina@example.com' });
  });

  it('rejects empty and malformed addresses', () => {
    expect(validateSubscribe({ email: '' }).ok).toBe(false);
    expect(validateSubscribe({ email: 'not-an-email' }).ok).toBe(false);
    expect(validateSubscribe({ email: 'no@tld' }).ok).toBe(false);
    expect(validateSubscribe({}).ok).toBe(false);
  });

  it('rejects an over-long address', () => {
    expect(validateSubscribe({ email: 'a'.repeat(250) + '@example.com' }).ok).toBe(false);
  });

  it('flags the honeypot separately so the route can answer 200', () => {
    // Returning an error to a bot teaches it what tripped. The route replies 200.
    const r = validateSubscribe({ email: 'bot@example.com', website: 'http://spam' });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.botDetected).toBe(true);
  });

  it('ignores an empty honeypot', () => {
    expect(validateSubscribe({ email: 'tina@example.com', website: '  ' }).ok).toBe(true);
  });
});

describe('subscribeViaGhost', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.GHOST_URL = 'https://cms.example.test';
    delete process.env.GHOST_INTERNAL_URL;
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  const text = (status: number, body = '') => ({ ok: status < 400, status, text: async () => body });

  it('fetches an integrity token, then posts the magic-link request with the visitor IP', async () => {
    const f = vi.fn().mockResolvedValueOnce(text(200, 'tok123')).mockResolvedValueOnce(text(201, 'Created.'));
    vi.stubGlobal('fetch', f);
    const r = await subscribeViaGhost('a@example.com', '203.0.113.9');
    expect(r).toEqual({ ok: true });

    expect(f.mock.calls[0][0]).toBe('https://cms.example.test/members/api/integrity-token/');
    const [url, init] = f.mock.calls[1];
    expect(url).toBe('https://cms.example.test/members/api/send-magic-link/');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Forwarded-For']).toBe('203.0.113.9');
    expect(init.headers['X-Forwarded-Proto']).toBe('https');
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@example.com',
      emailType: 'subscribe',
      integrityToken: 'tok123',
      honeypot: '',
    });
  });

  it('prefers the private-network URL when one is set', async () => {
    process.env.GHOST_INTERNAL_URL = 'http://ghost.railway.internal:2368';
    const f = vi.fn().mockResolvedValueOnce(text(200, 't')).mockResolvedValueOnce(text(201));
    vi.stubGlobal('fetch', f);
    await subscribeViaGhost('a@example.com', '1.2.3.4');
    expect(f.mock.calls[0][0]).toBe('http://ghost.railway.internal:2368/members/api/integrity-token/');
  });

  it('maps a Ghost 400 to the generic error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(text(200, 't')).mockResolvedValueOnce(text(400, 'blocked domain')));
    expect(await subscribeViaGhost('a@example.com', '1.2.3.4')).toEqual({
      ok: false,
      status: 502,
      error: 'Something went wrong. Please try again.',
    });
  });

  it('maps a Ghost 429 to the existing too-many-attempts message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(text(200, 't')).mockResolvedValueOnce(text(429)));
    expect(await subscribeViaGhost('a@example.com', '1.2.3.4')).toEqual({
      ok: false,
      status: 429,
      error: 'Too many attempts. Try again shortly.',
    });
  });

  it('fails cleanly when the token request fails, when fetch throws, and when Ghost is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(text(500)));
    expect((await subscribeViaGhost('a@example.com', '1.2.3.4')).ok).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')));
    expect((await subscribeViaGhost('a@example.com', '1.2.3.4')).ok).toBe(false);

    delete process.env.GHOST_URL;
    const r = await subscribeViaGhost('a@example.com', '1.2.3.4');
    expect(r).toEqual({ ok: false, status: 503, error: 'Sign-up is unavailable right now.' });
  });
});
