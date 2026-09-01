import type { Metadata } from 'next';
import HowBlocks from '@/components/HowBlocks';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, faqPageSchema, jsonLdGraph } from '@/lib/schema';
import { pageMetadata } from '@/lib/seoCopy';
import { FAQ } from '@/lib/faq';

export const metadata: Metadata = pageMetadata('/faq');

/**
 * Every answer here is either a plain factual definition (what modest
 * fashion/an abaya is) or paraphrased from copy that already exists
 * elsewhere on the site — the HOW steps on /about and the affiliate
 * disclosure in the footer — rather than invented. CLAUDE.md §10.18: no
 * brand voice gets written here that Tina hasn't already written herself.
 */

export default function FaqPage() {
  return (
    <main className="max-w-[760px] mx-auto px-8 pt-12 md:pt-16 pb-24">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }]),
          faqPageSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
        )}
      />
      <h1 className="section-heading text-3xl md:text-4xl">Frequently asked questions</h1>
      <p className="mt-3 mb-10 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        How The Modesty House works, in plain terms.
      </p>
      {/* h2, not the default h3 — this page has no other h2 for these to nest under. */}
      <HowBlocks
        blocks={FAQ.map((f, i) => ({ step: String(i + 1).padStart(2, '0'), title: f.q, body: f.a }))}
        headingLevel="h2"
        goal="faq_open"
      />
    </main>
  );
}
