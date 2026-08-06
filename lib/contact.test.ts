import { describe, it, expect } from 'vitest';
import { validateContact, buildEmail, escapeHtml, sanitizeHeader, emailConfig } from './contact';

const valid = {
  name: 'Amina',
  email: 'amina@example.com',
  topic: 'seal',
  message: 'I would like to apply for the seal for my label.',
};

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    const r = validateContact(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fields.topic).toBe('seal');
  });

  it('trims whitespace rather than treating it as content', () => {
    const r = validateContact({ ...valid, name: '   Amina   ' });
    expect(r.ok && r.fields.name).toBe('Amina');
  });

  it('rejects a blank submission with one error per field', () => {
    const r = validateContact({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['email', 'message', 'name']);
  });

  it('defaults a missing topic to general instead of failing', () => {
    const r = validateContact({ ...valid, topic: undefined });
    expect(r.ok && r.fields.topic).toBe('general');
  });

  it('rejects an unknown topic — the select is not to be trusted', () => {
    const r = validateContact({ ...valid, topic: 'admin' });
    expect(r.ok).toBe(false);
  });

  it('rejects a too-short message', () => {
    const r = validateContact({ ...valid, message: 'hi' });
    expect(r.ok).toBe(false);
  });

  it('rejects an over-long message rather than truncating it', () => {
    const r = validateContact({ ...valid, message: 'x'.repeat(5001) });
    expect(r.ok).toBe(false);
  });

  it('rejects non-string input without throwing', () => {
    const r = validateContact({ name: 42, email: {}, message: [], topic: null });
    expect(r.ok).toBe(false);
  });

  it.each([
    'plainaddress',
    'no@tld',
    'two@@example.com',
    'spaces in@example.com',
    '@example.com',
  ])('rejects malformed address %s', (email) => {
    expect(validateContact({ ...valid, email }).ok).toBe(false);
  });

  it.each([
    'a@b.co',
    'first.last+tag@sub.example.co.uk',
    "o'brien@example.com",
  ])('accepts valid address %s', (email) => {
    expect(validateContact({ ...valid, email }).ok).toBe(true);
  });

  it('flags the honeypot as a bot and does not leak field errors', () => {
    const r = validateContact({ ...valid, website: 'http://spam.example' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.botDetected).toBe(true);
      expect(r.errors.name).toBeUndefined();
    }
  });
});

describe('escaping', () => {
  it('escapes HTML so a submitted script tag cannot execute in the email', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('strips CR/LF so a name cannot inject an email header', () => {
    expect(sanitizeHeader('Amina\r\nBcc: victim@example.com')).toBe(
      'Amina Bcc: victim@example.com',
    );
  });
});

describe('buildEmail', () => {
  const fields = { name: 'Amina', email: 'amina@example.com', topic: 'seal', message: 'Hello there' } as const;

  it('puts the topic label in the subject', () => {
    expect(buildEmail({ ...fields }).subject).toBe('[Apply for the seal] Amina');
  });

  it('keeps the sender address in the body, so it survives even if reply_to is ignored', () => {
    expect(buildEmail({ ...fields }).text).toContain('amina@example.com');
  });

  it('never emits a raw newline in the subject', () => {
    const { subject } = buildEmail({ ...fields, name: 'A\r\nX' });
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('escapes the message in the HTML part', () => {
    const { html } = buildEmail({ ...fields, message: '<b>hi</b>' });
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;');
    expect(html).not.toContain('<b>hi</b>');
  });
});

describe('emailConfig', () => {
  const full: Record<string, string | undefined> = {
    CLOUDFLARE_ACCOUNT_ID: 'acct',
    CLOUDFLARE_EMAIL_TOKEN: 'tok',
    CONTACT_TO_EMAIL: 'hello@themodestyhouse.com',
    CONTACT_FROM_EMAIL: 'noreply@themodestyhouse.com',
  };

  it('returns config when every variable is present', () => {
    expect(emailConfig(full)).toEqual({
      accountId: 'acct', token: 'tok',
      to: 'hello@themodestyhouse.com', from: 'noreply@themodestyhouse.com',
    });
  });

  it.each(Object.keys(full))('returns null when %s is missing, so the route can fail loudly', (key) => {
    const env = { ...full };
    delete env[key];
    expect(emailConfig(env)).toBeNull();
  });
});
