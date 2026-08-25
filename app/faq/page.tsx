import type { Metadata } from 'next';
import HowBlocks from '@/components/HowBlocks';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, faqPageSchema, jsonLdGraph } from '@/lib/schema';
import { pageMetadata } from '@/lib/seoCopy';

export const metadata: Metadata = pageMetadata('/faq');

/**
 * Every answer here is either a plain factual definition (what modest
 * fashion/an abaya is) or paraphrased from copy that already exists
 * elsewhere on the site — the HOW steps on /about and the affiliate
 * disclosure in the footer — rather than invented. CLAUDE.md §10.18: no
 * brand voice gets written here that Tina hasn't already written herself.
 */
const FAQ = [
  {
    q: 'Is The Modesty House a shop?',
    a: "No — there's no cart here. Every piece links to the house that made it, at its own price and in its own currency, and you buy from them.",
  },
  {
    q: 'How are the brands chosen?',
    a: 'Independent houses that design their own clothes — pieces we would put in front of someone whose taste we respect, in stock a shopper can actually buy today. Whole labels are cut when they do not meet the standard, and cut labels stay cut.',
  },
  {
    q: "What's excluded?",
    a: 'Menswear, perfume, bakhoor, candles and gift sets are removed before anything is published, along with mass-market and budget labels. Hijabs and swim/activewear stay on their own pages rather than mixed into everyday grids.',
  },
  {
    q: 'How current is the catalogue?',
    a: 'The catalogue is re-read nightly — new arrivals appear, and anything a house has removed or sold out stops being shown.',
  },
  {
    q: 'What is modest fashion?',
    a: 'Clothing designed with more coverage and a looser silhouette — long sleeves, higher necklines, longer hemlines — worn for religious, cultural or personal reasons.',
  },
  {
    q: 'What is an abaya?',
    a: 'A loose, full-length outer garment, traditionally worn as a robe or cloak over other clothing.',
  },
  {
    q: 'Do prices include shipping, and can I return something?',
    a: "Shipping, returns and sizing are set by each individual brand, not by us — check the brand's own site before buying.",
  },
  {
    // Was: "Prices are shown in each brand's own currency... we don't convert
    // or mark them up." That stopped being true 2026-08-12, when the currency
    // switcher defaulted to an approximate USD conversion (CLAUDE.md §8,
    // ADR-0002 supersession) — this contradicted the live site's own "≈ $X"
    // prices and header currency picker. Rewritten to match lib/fx.ts's own
    // description of the behaviour (an opt-in comparison aid, always marked
    // with "≈", never presented as the real price), not invented from
    // scratch.
    q: 'Why do prices show in different currencies?',
    a: "Prices default to an approximate conversion, marked with ≈, so you can compare across houses without doing the maths — switch currency any time in the picker. Either way, the number you actually pay is whatever the house charges, in its own currency, on its own site. We never mark anything up.",
  },
  {
    q: 'Do you have hijabs, swimwear or activewear?',
    a: "Yes — hijabs, modest swimwear and modest activewear each have their own page, since they don't belong mixed into an everyday clothing grid.",
  },
  {
    q: 'How do you make money?',
    a: 'Some links are affiliate links — if you buy through one we may earn a commission at no extra cost to you.',
  },
];

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
      />
    </main>
  );
}
