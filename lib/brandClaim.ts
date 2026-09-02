import { BRANDS } from '@/data/brands';

/**
 * "Is this your house?" — the claim flow's evidence, not its decision.
 *
 * A brand owner who finds their own page (which is how they find us at all —
 * brand-name search is what these pages rank for) can claim it through the
 * contact form. NOTHING here publishes anything: the claim arrives as an email
 * and Tina pastes the description in by hand. So this file's job is not to
 * authorise, it is to save her a lookup — it says how much the sender's address
 * is worth as proof, and lets her decide.
 *
 * WHY NOT A HARD DOMAIN CHECK. The obvious rule is "the sender's email must be
 * at the brand's own domain", and it would be wrong here: a large share of the
 * houses in this directory are one person on Shopify with a Gmail address
 * published on their own contact page. A domain rule excludes exactly the
 * brands most likely to claim, and admits nobody it should not — so it is a
 * SIGNAL, ranked, and never a gate.
 *
 * The three routes a real brand can pass, strongest first:
 *   1. `domain` — the address is at the storefront's own domain. Conclusive.
 *   2. `published` — the address is not at their domain, but IS the address
 *      their own site publishes. Checked by hand today; the nightly fetch
 *      already reads their site, so it can be automated later.
 *   3. `token` — they put a code anywhere on their storefront and we read it
 *      back. Unfakeable without store admin, and the fallback for the brands
 *      the first two miss.
 */

/** Bumped whenever /brand-terms changes in a way a claimant would care about.
 *  Recorded with every acceptance, so an old claim is never assumed to have
 *  agreed to a newer text. */
export const CLAIM_TERMS_VERSION = '2026-09-02';

export type ClaimVerdict = 'domain-match' | 'domain-mismatch' | 'unknown-brand' | 'no-email';

export interface ClaimSignal {
  verdict: ClaimVerdict;
  /** The storefront host we expect, e.g. `bymerrachi.com`. */
  expected: string | null;
  /** The host the sender's address is at, e.g. `gmail.com`. */
  sender: string | null;
  /** One line for the notification email — the whole point of this module. */
  note: string;
}

/** Host without `www.`, lowercased. Never throws on a malformed URL. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True when the sender's host IS the storefront's host, or a subdomain of it.
 *
 * Subdomains count in one direction only: `mail.bymerrachi.com` is theirs,
 * `bymerrachi.com.example.net` is not, and a naive `endsWith` would accept the
 * second — which is the whole trick behind a lookalike domain.
 */
export function sameSite(sender: string, expected: string): boolean {
  return sender === expected || sender.endsWith(`.${expected}`);
}

export function claimSignal(brandSlug: string, email: string): ClaimSignal {
  const brand = BRANDS.find((b) => b.slug === brandSlug);
  if (!brand) {
    return {
      verdict: 'unknown-brand',
      expected: null,
      sender: null,
      note: `UNKNOWN BRAND "${brandSlug}" — not in data/brands.ts.`,
    };
  }

  const expected = hostOf(brand.homepage);
  const sender = email.includes('@') ? email.split('@').pop()!.trim().toLowerCase() : null;

  if (!sender || !expected) {
    return {
      verdict: 'no-email',
      expected,
      sender,
      note: `Could not read a domain from the address. Storefront is ${expected ?? brand.homepage}.`,
    };
  }

  if (sameSite(sender, expected)) {
    return {
      verdict: 'domain-match',
      expected,
      sender,
      note: `VERIFIED BY DOMAIN — ${sender} is ${brand.name}'s own storefront domain.`,
    };
  }

  return {
    verdict: 'domain-mismatch',
    expected,
    sender,
    note:
      `NOT VERIFIED BY DOMAIN — wrote from ${sender}, storefront is ${expected}. ` +
      `Many small houses use a free address, so this is not a rejection: check whether ` +
      `${expected} publishes ${email} on its own site, or ask them to put a code on the store.`,
  };
}

/** Every house that has a page of its own can be claimed. Used to reject a
 *  `?brand=` that does not exist rather than emailing about a mystery slug. */
export function isClaimableBrand(slug: string): boolean {
  return BRANDS.some((b) => b.slug === slug);
}
