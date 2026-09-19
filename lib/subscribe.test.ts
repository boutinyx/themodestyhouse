import { describe, it, expect } from 'vitest';
import { validateSubscribe, buildSubscribeEmail } from './subscribe';

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

describe('buildSubscribeEmail', () => {
  it('escapes the address in the HTML body', () => {
    const { html } = buildSubscribeEmail('a<script>@example.com');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('strips newlines from the subject so headers cannot be injected', () => {
    const { subject } = buildSubscribeEmail('a@b.com\nBcc: victim@example.com');
    expect(subject).not.toContain('\n');
  });
});
