import { describe, it, expect } from 'vitest';
import { getLegalDoc, LEGAL_LAST_UPDATED } from './legal';

/**
 * These tests replace the runtime "not ready to publish" banner that used to
 * live in app/legal/LegalPage.tsx. A legal document that still contains a
 * placeholder is a launch blocker, and this is where that now fails — in CI,
 * rather than in front of a visitor.
 */

/** An unfilled placeholder: bracketed ALL-CAPS, e.g. [OPERATOR NAME], [TBD].
 *  Deliberately anchored on an uppercase first character so it cannot match a
 *  markdown link like [/contact](/contact) or [autoriteitpersoonsgegevens.nl]. */
const PLACEHOLDER = /\[[A-Z][A-Z0-9 _-]*\]/;

const SLUGS = ['privacy', 'terms'] as const;

describe('the placeholder pattern itself', () => {
  // Per CLAUDE.md §10.5 / §10.10: every new regex is tested against a known-good
  // positive AND a known-good negative before it is trusted.
  it('matches a real unfilled placeholder', () => {
    expect(PLACEHOLDER.test('owned by **[OPERATOR NAME]** / The Modesty House')).toBe(true);
    expect(PLACEHOLDER.test('[TBD]')).toBe(true);
  });

  it('does not match the markdown links these documents legitimately contain', () => {
    expect(PLACEHOLDER.test('use the form at [/contact](/contact)')).toBe(false);
    expect(PLACEHOLDER.test('[autoriteitpersoonsgegevens.nl](https://autoriteitpersoonsgegevens.nl)')).toBe(false);
    expect(PLACEHOLDER.test('email us at [hello@themodestyhouse.com](mailto:x)')).toBe(false);
  });
});

describe.each(SLUGS)('content/legal/%s.md', (slug) => {
  const doc = getLegalDoc(slug);

  it('loads and has a title and a body', () => {
    expect(doc).not.toBeNull();
    expect(doc!.title.length).toBeGreaterThan(0);
    expect(doc!.body.trim().length).toBeGreaterThan(500);
  });

  it('contains no unfilled placeholder', () => {
    const hit = doc!.body.match(PLACEHOLDER);
    expect(hit?.[0] ?? null).toBeNull();
  });
});

describe('GDPR disclosures that must not silently regress', () => {
  const privacy = getLegalDoc('privacy')!.body;

  it('names an identifiable data controller (Art. 13)', () => {
    expect(privacy).toMatch(/data controller/i);
    expect(privacy).toMatch(/\*\*The Modesty House\*\*, based in the Netherlands/);
  });

  it('discloses Cloudflare, which sees every visitor IP', () => {
    // app/api/contact/route.ts reads CF-Connecting-IP, which only exists because
    // traffic is proxied through Cloudflare; it also runs Turnstile and routes
    // inbound mail. If Cloudflare ever leaves the stack, delete this test
    // deliberately — do not let it rot into a false claim.
    expect(privacy).toMatch(/\*\*Cloudflare\*\*/);
  });

  it('discloses the OUTBOUND email provider that handles contact form messages', () => {
    // This is the disclosure that silently went stale once outbound mail moved
    // from Cloudflare Email Sending to Resend (lib/contact.ts posts to
    // api.resend.com). Swapping the provider without editing §4 leaves the
    // policy naming the wrong processor for visitors' names, addresses and
    // message bodies — so pin it here rather than trusting anyone to remember.
    expect(privacy).toMatch(/\*\*Resend\*\*/);
  });

  it('does not still claim Cloudflare delivers contact form messages', () => {
    expect(privacy).not.toMatch(/Cloudflare[^.]*delivers contact form messages/);
  });

  it('discloses the contact form IP rate-limiting described in app/api/contact/route.ts', () => {
    expect(privacy).toMatch(/flood the form/);
  });

  it('names the supervisory authority for the stated country of establishment', () => {
    expect(privacy).toMatch(/Autoriteit Persoonsgegevens/);
  });
});

describe('LEGAL_LAST_UPDATED', () => {
  it('is a human-readable date, since it renders verbatim on both pages', () => {
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  });
});
