/**
 * The ten questions on /faq, in one place.
 *
 * Extracted from app/faq/page.tsx on 2026-09-01 because a SECOND consumer
 * appeared — /llms-full.txt, which inlines them for answer engines. Copying the
 * array would have been the §8 duplicated-exclusion-logic trap in a new file:
 * two lists that agree today, drift silently, and leave the machine-readable
 * one quietly lying about what the site says.
 *
 * These are Tina's words. Nothing here is generated, and nothing may be
 * rephrased to suit a consumer (§10.18).
 */
export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ: FaqEntry[] = [
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
