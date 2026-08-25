import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { TOPICS } from '@/lib/contactTopics';
import { buildMetadata } from '@/lib/seoCopy';

// Same OG/twitter fix as every other page — see the comment in
// app/about/page.tsx. Not in SEO_COPY, same reasoning as /about.
export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: 'Get in touch with The Modesty House — enquiries, brand submissions, press and corrections.',
  canonical: '/contact',
});

// ?topic=seal deep-links the "Apply for the seal" call to action straight to a
// pre-selected subject, so that CTA no longer has to be a mailto: link.
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const valid = TOPICS.some((t) => t.value === topic) ? topic : undefined;

  // Site key is public by design — it identifies the widget, it is not a secret.
  // The matching SECRET key stays server-side and is never NEXT_PUBLIC_*.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <main className="max-w-xl mx-auto px-8 pt-12 md:pt-16 pb-24">
      <div className="text-center">
        <h1 className="section-heading text-3xl md:text-4xl mt-3">Get in touch</h1>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          Brand submissions, press, corrections, or anything else — write to us here and
          we&rsquo;ll reply to the address you give, usually within 2 business days.
        </p>
        {/* Same address already disclosed in /privacy and /terms (content/legal/*.md)
            — reused, not invented. The "2 business days" figure is Tina's own
            (given 2026-08-13); it's an operational commitment only she can make,
            so it wasn't invented ahead of that — see CLAUDE.md §10.18. */}
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Or email{' '}
          <a href="mailto:hello@themodestyhouse.com" style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            hello@themodestyhouse.com
          </a>{' '}
          directly.
        </p>
      </div>
      <ContactForm siteKey={siteKey} defaultTopic={valid} />
    </main>
  );
}
