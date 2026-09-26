import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { buildMetadata } from '@/lib/seoCopy';

/**
 * /partner-with-us — the paid onboarding path.
 *
 * NOT linked from anywhere on the site. Tina sends this URL directly to a
 * house she's already talked to (starting with Fajr Noor, 2026-09-26) — it
 * is not a public "apply here" page, so it carries no nav/footer link and no
 * sitemap entry (app/sitemap.ts is an explicit map, not filesystem-driven,
 * so simply not adding it here is enough).
 *
 * WHY A SEPARATE TOPIC FROM 'seal': /contact's "Sign your brand up" flow is
 * the free, default-editorial path — a house is listed if its catalogue
 * clears the bar, no payment involved, and CLAUDE.md §7 / /brand-terms both
 * say plainly that placement is not for sale. This page's $99 is NOT a fee
 * for the editorial decision to include a house — that stays free and
 * unconditional, same as every other brand. It's a fee for the ONBOARDING
 * WORK (getting the products in, building the designers page) plus a
 * dedicated content push (blog post + Instagram feature) on top of it.
 * Read literally, /brand-terms' "placement is not for sale" and this page
 * sit close enough together that they're worth reconciling in wording
 * before this ever reaches a house that also reads that page — flagged to
 * Tina, not resolved here.
 */

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Partner with us',
    description: 'Partner onboarding for The Modesty House.',
    canonical: '/partner-with-us',
  }),
  robots: { index: false, follow: true },
};

const INCLUDED = [
  'Your products added to the directory and matched to the right categories',
  'A designers page built around your brand',
  'A dedicated blog post telling your story',
  'An Instagram feature',
  'We join your affiliate program — commission on top of all of the above, on any sales we send you',
];

const DEFAULT_MESSAGE = `Brand name & website:
What do you sell? (we only list women's clothing, hijabs, and layering pieces — other categories won't be included):
Based, and how long have you been running?:
Instagram handle:
`;

export default function PartnerWithUsPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <main className="max-w-2xl mx-auto px-8 pt-12 md:pt-20 pb-24">
      <div className="text-center">
        <div className="eyebrow" style={{ color: 'var(--brass)' }}>By invitation</div>
        <h1 className="section-heading text-3xl md:text-4xl mt-3">Partner with The Modesty House</h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--prose)' }}>
          A curated directory for aspirational, well-designed modest fashion. If you&rsquo;re
          here, it&rsquo;s because we&rsquo;ve already been through your catalogue and think it
          belongs in the directory.
        </p>
      </div>

      <section
        className="mt-12 rounded-2xl p-8"
        style={{ background: '#fff', border: '1px solid var(--hairline)' }}
      >
        <div className="eyebrow" style={{ color: 'var(--brass)' }}>What&rsquo;s included — $99 one-time</div>
        <ul className="mt-4 space-y-3">
          {INCLUDED.map((line) => (
            <li key={line} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: 'var(--prose)' }}>
              <span aria-hidden="true" style={{ color: 'var(--brass)' }}>&mdash;</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm" style={{ color: 'var(--muted)' }}>
          Note: we only bring in women&rsquo;s clothing, hijabs, and layering pieces —
          other categories on your site won&rsquo;t be listed.
        </p>
      </section>

      <div className="mt-12">
        <h2 className="eyebrow" style={{ color: 'var(--brass)' }}>Get started</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Fill in the message below and we&rsquo;ll follow up within a few days.
        </p>
        <ContactForm
          siteKey={siteKey}
          defaultTopic="partner"
          defaultMessage={DEFAULT_MESSAGE}
        />
      </div>
    </main>
  );
}
