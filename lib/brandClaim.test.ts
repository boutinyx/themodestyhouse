import { describe, it, expect } from 'vitest';
import { BRANDS } from '../data/brands';
import { CLAIM_TERMS_VERSION, claimSignal, hostOf, isClaimableBrand, sameSite } from './brandClaim';
import { buildEmail, validateContact } from './contact';

describe('sameSite', () => {
  // The whole reason this is not `endsWith` — see the function's own comment.
  it('accepts the domain and its subdomains', () => {
    expect(sameSite('bymerrachi.com', 'bymerrachi.com')).toBe(true);
    expect(sameSite('mail.bymerrachi.com', 'bymerrachi.com')).toBe(true);
  });

  it('rejects a lookalike that merely ends with the domain', () => {
    expect(sameSite('bymerrachi.com.evil.net', 'bymerrachi.com')).toBe(false);
    expect(sameSite('notbymerrachi.com', 'bymerrachi.com')).toBe(false);
    expect(sameSite('gmail.com', 'bymerrachi.com')).toBe(false);
  });
});

describe('hostOf', () => {
  it('strips www and lowercases', () => {
    expect(hostOf('https://WWW.ByMerrachi.com/collections/all')).toBe('bymerrachi.com');
  });

  it('returns null rather than throwing on nonsense', () => {
    expect(hostOf('not a url')).toBeNull();
  });
});

describe('claimSignal', () => {
  const slug = 'merrachi';
  const brand = BRANDS.find((b) => b.slug === slug)!;

  it('verifies an address at the house’s own domain', () => {
    const s = claimSignal(slug, `hello@${hostOf(brand.homepage)}`);
    expect(s.verdict).toBe('domain-match');
    expect(s.note).toMatch(/VERIFIED BY DOMAIN/);
  });

  it('does NOT reject a free address — most small houses use one', () => {
    // The point of the module: a Gmail claim is unverified, not refused, and
    // the note has to tell Tina what to do next rather than just say no.
    const s = claimSignal(slug, 'merrachi.official@gmail.com');
    expect(s.verdict).toBe('domain-mismatch');
    expect(s.note).toMatch(/not a rejection/);
    expect(s.note).toContain(hostOf(brand.homepage)!);
  });

  it('names an unknown house instead of guessing', () => {
    expect(claimSignal('not-a-house', 'a@b.com').verdict).toBe('unknown-brand');
  });

  it('knows which houses can be claimed', () => {
    expect(isClaimableBrand(slug)).toBe(true);
    expect(isClaimableBrand('not-a-house')).toBe(false);
  });
});

describe('a claim submission', () => {
  const base = {
    name: 'A Founder',
    email: 'hello@bymerrachi.com',
    message: 'This is our house. Here is our description for the page.',
  };

  it('is rejected without the clickwrap, since an unticked box agreed to nothing', () => {
    const r = validateContact({ ...base, topic: 'claim', brand: 'merrachi' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.acceptedTerms).toBeTruthy();
  });

  it('is rejected without a house, and without a house that exists', () => {
    const noBrand = validateContact({ ...base, topic: 'claim', acceptedTerms: true });
    expect(noBrand.ok).toBe(false);
    const badBrand = validateContact({ ...base, topic: 'claim', brand: 'not-a-house', acceptedTerms: true });
    expect(badBrand.ok).toBe(false);
    if (!badBrand.ok) expect(badBrand.errors.brand).toBeTruthy();
  });

  it('records the terms version it was shown, not the current one by assumption', () => {
    const r = validateContact({ ...base, topic: 'claim', brand: 'merrachi', acceptedTerms: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fields.brand).toBe('merrachi');
      expect(r.fields.termsVersion).toBe(CLAIM_TERMS_VERSION);
    }
  });

  it('leaves every other topic exactly as it was', () => {
    // The claim rules must not become requirements for the contact form at
    // large — that would break the seal, press and correction paths.
    const r = validateContact({ ...base, topic: 'general' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fields.brand).toBeUndefined();
      expect(r.fields.termsVersion).toBeUndefined();
    }
  });
});

describe('the claim notification', () => {
  const claim = {
    name: 'A Founder',
    email: 'hello@bymerrachi.com',
    topic: 'claim' as const,
    message: 'Our description.',
    brand: 'merrachi',
    termsVersion: CLAIM_TERMS_VERSION,
  };

  it('names the house in the subject, so the inbox is scannable', () => {
    expect(buildEmail(claim).subject).toContain('merrachi');
  });

  it('does the domain check for her, rather than leaving it to be looked up', () => {
    expect(buildEmail(claim).text).toMatch(/VERIFIED BY DOMAIN/);
    expect(buildEmail({ ...claim, email: 'someone@gmail.com' }).text).toMatch(/NOT VERIFIED BY DOMAIN/);
  });

  it('carries the acceptance record — version, time and origin', () => {
    const { text } = buildEmail(claim, { ip: '203.0.113.7', at: '2026-09-02T10:00:00.000Z' });
    expect(text).toContain(CLAIM_TERMS_VERSION);
    expect(text).toContain('2026-09-02T10:00:00.000Z');
    expect(text).toContain('203.0.113.7');
  });

  it('adds none of that to an ordinary message', () => {
    const { subject, text } = buildEmail({ name: 'A Reader', email: 'a@b.com', topic: 'general', message: 'Hello.' });
    expect(subject).not.toContain('merrachi');
    expect(text).not.toMatch(/House:|Check:|Terms:/);
  });
});
