import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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

  // Couples the running code to the disclosure rather than trusting anyone to
  // remember. Reads app/layout.tsx and next.config.ts directly: if the analytics
  // script is shipped, or its hosts are allowlisted in the CSP, the policy MUST
  // name the provider. This is the guard that was missing when outbound email
  // moved to Resend and §4 silently went stale.
  it('discloses analytics whenever the analytics script is actually shipped', () => {
    const layout = readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf8');
    const config = readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf8');
    const shipped = layout.includes('js.ciphera.net') || config.includes('js.ciphera.net');

    if (shipped) {
      expect(privacy).toMatch(/\*\*Pulse\*\*|\*\*Pulse \(ciphera\.net\)\*\*/);
      // §5 must not still claim we run no analytics.
      expect(privacy).not.toMatch(/do \*\*not\*\* currently use advertising cookies, analytics/);
    }
  });

  // CUSTOM EVENTS, coupled to the policy. §2 enumerates exactly what Pulse
  // collects, so shipping a goal without extending that list makes a published
  // legal document quietly false — the §10.19 failure, in the one file where it
  // is a legal problem rather than a red build.
  //
  // The table is keyed by EVERY goal lib/pulse.ts declares, and the assertion
  // below fails if a goal is added without an entry here, so a new event cannot
  // be shipped by editing only the code.
  const DISCLOSED: Record<string, RegExp> = {
    outbound_click: /- \*\*Clicks through to a brand\.\*\*/,
    favourite_add: /- \*\*Pieces you save\.\*\*/,
    quick_view_open: /opening a product's quick view|opening a product’s quick view/,
    share_link_copy: /copying a product's share link|copying a product’s share link/,
    currency_change: /changing the display currency/,
    filter_apply: /using a filter or the sort control/,
    newsletter_signup: /signing up to the newsletter/,
    contact_submit: /sending the contact form/,
    faq_open: /opening an FAQ question/,
    search_zero_results: /- \*\*Searches that find nothing\.\*\*/,
    about_step_open: /a step of the “how it works” column|how it works/,
    image_zoom: /opening a product's photograph full size|opening a product’s photograph full size/,
    load_more: /tapping “Load more”|tapping "Load more"/,
    nav_open: /opening a navigation menu/,
    rail_scroll: /scrolling one of the homepage rails/,
    region_filter: /opening a region\*{0,2} on the designers map/,
    subtype_click: /following a sub-category link/,
  };

  const pulseSource = readFileSync(path.join(process.cwd(), 'lib', 'pulse.ts'), 'utf8');
  /** The goal names as the code declares them — read from the source, not
   *  imported, so this stays a check on the file the browser ships. */
  const declared = [...pulseSource.matchAll(/^  (?:\/\*\*[\s\S]*?\*\/\n)?\s*([a-z_]+): \[/gm)].map((m) => m[1]);

  it('reads every goal out of lib/pulse.ts, so the guards below cannot be vacuous', () => {
    // §10.28 rule 3: a check that silently matches nothing is a check you do
    // not have. Seventeen goals as of 2026-08-31.
    expect(declared.length).toBeGreaterThanOrEqual(17);
    expect(declared).toContain('outbound_click');
    expect(declared).toContain('search_zero_results');
  });

  it('discloses every goal the code can emit', () => {
    for (const event of declared) {
      expect(DISCLOSED[event], `no §2 disclosure mapped for the goal "${event}"`).toBeTruthy();
      expect(privacy, `§2 does not disclose the goal "${event}"`).toMatch(DISCLOSED[event]);
    }
  });

  it('keeps the two promises that are easiest to break by accident', () => {
    // An outbound click must still NOT name the product...
    expect(privacy).toMatch(/do \*\*not\*\* record which specific product/);
    // ...while a save must, which is the asymmetry the code implements.
    expect(privacy).toMatch(/we do record \*\*which product\*\*/);
    // The favourites bullet must no longer claim the save is unrecorded.
    expect(privacy).not.toMatch(/`tmh_favs`\)\. It never reaches our servers/);
    // The contact and newsletter goals must promise what goalProps enforces.
    expect(privacy).toMatch(/never your name, address or message/);
    expect(privacy).toMatch(/never your email address/);
  });

  it('does not promise a consent banner it never shows', () => {
    // §5 previously promised "ask for your consent through a cookie banner
    // first" for any analytics. Shipping cookieless analytics under legitimate
    // interest without a banner makes that promise false, so it must be gone.
    expect(privacy).not.toMatch(/ask for your consent through a cookie banner first/);
  });
});

describe('LEGAL_LAST_UPDATED', () => {
  it('is a human-readable date, since it renders verbatim on both pages', () => {
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  });
});
