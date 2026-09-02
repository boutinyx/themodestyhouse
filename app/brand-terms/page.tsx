import type { Metadata } from 'next';
import Link from 'next/link';
import { CLAIM_TERMS_VERSION } from '@/lib/brandClaim';
import { buildMetadata } from '@/lib/seoCopy';

/**
 * /brand-terms — what a house agrees to when it claims its page.
 *
 * READ THIS BEFORE ADDING A CLAUSE.
 *
 * This page deliberately contains ONLY terms that are plainly true of what the
 * site already does, and that a house can verify by reading them. It has no
 * liability cap, no indemnity, and no waiver — not because those are unwanted,
 * but because whether they hold up is a question of Dutch and EU law, and
 * `content/legal/privacy.md` and `terms.md` were both written carefully rather
 * than quickly for the same reason. A clause that a court strikes out is worse
 * than no clause: it makes the whole document look drafted to catch someone.
 * If a liability or indemnity clause is wanted, it goes past a lawyer first,
 * and `CLAIM_TERMS_VERSION` moves when it lands.
 *
 * The point of the page is narrower and genuinely useful: a claimant states
 * they are authorised, licenses us to publish what they send, and acknowledges
 * that listing is not endorsement and that placement is not for sale. That last
 * one protects the seal, which is the only thing this site sells nothing for.
 *
 * NOINDEX until it has been reviewed. It is a real page a claimant can read; it
 * is not something Google should be ranking as this site's terms.
 */

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Brand terms',
    description: 'What a house agrees to when it claims its page on The Modesty House.',
    canonical: '/brand-terms',
  }),
  robots: { index: false, follow: true },
};

const CLAUSES: { h: string; p: string }[] = [
  {
    h: 'You are authorised',
    p: 'By claiming a page you confirm you are the owner of that house, or authorised to act for it. We may ask you to show that — from an address at the house’s own domain, from the address the house publishes on its own site, or by placing a short code on the storefront.',
  },
  {
    h: 'What you send us, we may publish',
    p: 'Anything you send for the page — a description, a correction, a link — you licence us to publish on The Modesty House and in the machine-readable versions of it. You keep ownership of it. You confirm it is yours to give us.',
  },
  {
    h: 'We edit, and we may decline',
    p: 'We may edit what you send for length, clarity and house style, and we may decline it. Nothing is published automatically: a person reads every claim.',
  },
  {
    h: 'Listing is not endorsement, and placement is not for sale',
    p: 'Being listed is not a recommendation. The seal is editorial and cannot be bought, and no payment changes whether a house is listed, where it appears, or what we write about it.',
  },
  {
    h: 'Your prices, stock and orders stay yours',
    p: 'We read your public product feed and show what it says. Prices, availability, sizing, shipping, returns and every order are between you and the shopper — no order is ever placed here. If your feed is wrong, the page will be wrong, and we will correct it when you tell us.',
  },
  {
    h: 'Outbound links are affiliate links',
    p: 'Links to your store may carry an affiliate tag and a campaign tag. That does not change your price and does not oblige you to anything.',
  },
  {
    h: 'You can ask to be removed',
    p: 'Write to us and we will remove your house from the directory. Houses we remove stay removed unless you ask us to relist you.',
  },
  {
    h: 'Where this applies',
    p: 'These terms are governed by the law of the Netherlands, where The Modesty House is established.',
  },
];

export default function BrandTermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-8 pt-12 md:pt-16 pb-24">
      <h1 className="section-heading text-3xl md:text-4xl mt-3">Brand terms</h1>
      <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
        For houses claiming their page. Version {CLAIM_TERMS_VERSION}. For visitors, see{' '}
        <Link href="/terms" style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          the site terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          privacy policy
        </Link>
        .
      </p>

      {CLAUSES.map((c) => (
        <section key={c.h} className="mt-10">
          <h2 className="eyebrow" style={{ color: 'var(--brass)' }}>{c.h}</h2>
          <p className="mt-3" style={{ color: '#4c4048', fontSize: 16, lineHeight: 1.72 }}>{c.p}</p>
        </section>
      ))}

      <p className="mt-12 text-sm" style={{ color: 'var(--muted)' }}>
        Questions about any of this:{' '}
        <a href="mailto:hello@themodestyhouse.com" style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          hello@themodestyhouse.com
        </a>
        .
      </p>
    </main>
  );
}
