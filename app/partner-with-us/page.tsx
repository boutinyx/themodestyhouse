import type { Metadata } from 'next';
import { Check } from '@phosphor-icons/react/dist/ssr';
import { PartnerFAQTabs, type PartnerFAQ } from '@/components/PartnerFAQTabs';
import { PartnerInterestDialog } from '@/components/PartnerInterestDialog';
import { aboutStats, roundedPieces } from '@/lib/aboutStats';
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

/**
 * Every screenshot below is REAL, captured live from production (§10.18:
 * never invent what a partner would see; show the real thing instead).
 * Aab and Inayah are both real, currently-listed, verified houses
 * (data/brands.ts) — named because they are true today, not as placeholder
 * copy. If either is ever cut, update the names here too.
 *
 * partner-preview-category-2.jpg / -newin-2.jpg carry a "-2" because the
 * first crop (Tina: "you cut them like in half") cut mid-product-photo —
 * these replace it with a full uncut row. New filename, not a same-path
 * overwrite (§6): this page had already been sent/viewed once, so bytes at
 * the old path could sit in a cache for hours (§10.21, §10.57).
 */
/**
 * Literal FAQ questions — Tina: "I want those literally to be questions
 * that they could ask." `label` is new: the tabs layout (below) needs a
 * short name per question since the full question doesn't fit as a tab —
 * same five questions, same answers, same screenshots as every layout
 * before this one; only the container changed.
 */
const FAQS: PartnerFAQ[] = [
  {
    label: 'Where I show up',
    q: 'Is the designers page the only place I’ll show up?',
    a: 'No — your pieces live permanently in the real category grids people filter and scroll every day. It’s a standing spot in the directory, not a one-off placement that fades after launch.',
    images: [
      { src: '/partner-preview-category-2.jpg', alt: 'The Modesty House Abayas category page, showing filters and a full row of complete product photos from multiple houses', w: 1280, h: 920 },
      { src: '/partner-preview-newin-2.jpg', alt: 'The Modesty House New In page, showing a full row of the latest complete pieces added across houses', w: 1280, h: 1040 },
    ],
  },
  {
    label: 'My listing',
    q: 'How will my listing look on the designers page?',
    a: 'A real page built around your brand — your story, your price range, your pieces. Here’s what a real one looks like today.',
    images: [{ src: '/partner-preview-designers.jpg', alt: 'Aab’s live designers page on The Modesty House, showing its description, piece count, price range and a Visit Aab button', w: 1280, h: 460 }],
  },
  {
    label: 'Blog post',
    q: 'What does the blog post actually look like?',
    a: 'A real, dedicated piece about your brand — written by us, with a link straight to your site. Not a name in a list — its own post, and that link helps your SEO too.',
  },
  {
    label: 'SEO',
    q: 'Will this actually help my SEO?',
    a: 'Yes — a real link back to your site, the kind Google factors into how high your own site ranks when people search for you. So on top of the traffic we send you directly, it also helps you rank higher in Google on your own.',
  },
  {
    label: 'Instagram',
    q: 'What does the Instagram feature actually look like?',
    a: 'A real introduction post about you and your brand — your own story and photos, not a generic shoutout. And you’re welcome to repost it on your own page too.',
  },
  {
    label: 'Affiliate',
    q: 'What if I don’t have an affiliate program set up?',
    a: 'We join your affiliate program — you only pay out on sales we actually send you. No program yet? Most Shopify stores can set one up in an afternoon with an app like UpPromote or Refersion, and we’re happy to point you to one.',
  },
];

const DEFAULT_MESSAGE = `Brand name & website:
What do you sell? (we only list women's clothing, hijabs, and layering pieces — other categories won't be included):
Based, and how long have you been running?:
Instagram handle:
`;

export default function PartnerWithUsPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const stats = aboutStats();

  return (
    // Dark background reverted — Tina asked for it back to the original
    // (light/parchment) after trying #1b1119 from faq-layouts.html. The
    // tabs FAQ layout she picked separately stays; only the background and
    // the text colours tuned for it are undone.
    <main className="max-w-4xl mx-auto px-8 pt-12 md:pt-16 pb-24">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="section-heading text-4xl md:text-5xl">Partner with The Modesty House</h1>
        <p className="mt-5 text-lg leading-relaxed" style={{ color: 'var(--prose)' }}>
          The Modesty House is a curated directory for aspirational, well-designed modest
          fashion. Shoppers are already here looking for exactly what you make. This is how
          you show up in front of them.
        </p>
      </div>

      {/* "YOU WON'T BE LISTED ALONE" section — no heading now, on Tina's
          word ("remove this one and only keep [the paragraph]"); it exists
          in code comments only, to name what this section is for. Text and
          screenshot are swapped from /about's own order: photo first, then
          the paragraph, then the aubergine receipts band. The photo and the
          stats band got sized independently, in two rounds, and land on
          different widths on purpose:

          - The SCREENSHOT stays at the smaller, rounded max-w-2xl treatment
            — Tina: "keep the picture the same way it was before" — after a
            round where I'd widened it to full-bleed along with the band, she
            wanted only the band taken back to full width, not the picture.
          - The STATS BAND is full-bleed — Tina: "I wanted the band to be as
            big as the page... do it as wide as the page again" — breaking
            out of the page's own max-w-4xl via `left-1/2 -translate-x-1/2
            w-screen` (verified with Playwright at 390/1280/1920 — no
            horizontal scrollbar).

          The gap between them is `mt-3` on the picture's wrapper — she asked
          for that separately, before either width change, and never asked
          it removed.

          Still `object-fit: contain`, not `cover` like /about's mashrabiya
          photo: that photo was composed to survive an arbitrary crop, a
          screenshot of a product grid is not, and Tina already flagged once
          this session that a cropped screenshot reads as "cut in half".

          SCREENSHOT VERTICALLY CENTRED BETWEEN THE TWO TEXT BLOCKS — Tina:
          "put the image more in the middle between the 2 texts". Was
          mt-14 above (from the intro paragraph) and mt-6 below (to the
          "Aab, Inayah..." paragraph) — an uneven 56px/24px split that read
          as the image sitting closer to the paragraph under it than to the
          intro above it. Both mt-10 now. */}
      <section className="mt-10">
        <div className="max-w-2xl mx-auto px-8">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hairline)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- one-off internal screenshot, not editorial photography (lib/staticImage.ts's convention is /editorial and /about only) */}
            <img
              src="/partner-preview-grid.jpg"
              alt="The Modesty House designers grid, showing Veiled, Aab, Summer Evenings, Inayah and Glow Modesty side by side, each verified"
              width={1280}
              height={560}
              loading="lazy"
              className="w-full"
              style={{ background: 'var(--aubergine)', aspectRatio: '1280 / 560', objectFit: 'contain' }}
            />
          </div>
        </div>

        <div className="mt-10 max-w-4xl mx-auto px-8 text-center">
          <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--prose)' }}>
            Aab, Inayah, AbayaButh and 100+ other houses are already in the directory —
            verified, browsed, and selling. Your products sit in the same grids shoppers
            already trust.
          </p>
        </div>

        {/* THE RECEIPTS — Tina: "i wanted the purple background with the 115
            houses indexed etc". Same figures /about prints, computed the same
            way (lib/aboutStats.ts), not retyped: a number typed into a page
            rots the moment the nightly refresh moves it. */}
        <div className="aubergine-band w-screen relative left-1/2 -translate-x-1/2 mt-16 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 text-center">
            {[
              { value: String(stats.houses), label: 'houses indexed' },
              { value: roundedPieces(stats.pieces), label: 'pieces catalogued' },
              { value: String(stats.currencies), label: 'currencies' },
              { value: String(stats.sealed), label: 'carrying the seal' },
            ].map((f) => (
              <div key={f.label}>
                <div className="serif" style={{ fontSize: 'clamp(30px,5vw,48px)', lineHeight: 1, color: 'var(--parchment)' }}>
                  {f.value}
                </div>
                <div className="eyebrow mt-3" style={{ color: '#e7d3b6' }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — TABS, not the accordion this page used before. Tina compared
          all eight layouts in faq-layouts.html and picked 05 ("Tabs"): pill
          tabs floating on the page's own background, one answer panel below
          that swaps. Same five questions, same answers, same real
          screenshots underneath the first two — only the container changed.
          See components/PartnerFAQTabs.tsx for why this is its own
          component rather than PartnerFeatureAccordion re-skinned: the two
          are different information architectures (a list of open/closable
          rows vs. one visible question at a time), not the same component
          in a different colour. */}
      <div className="mt-14 max-w-2xl mx-auto">
        <PartnerFAQTabs items={FAQS} />
      </div>

      {/* Price, de-emphasized relative to the v1 of this page — split into
          a price half and a line-item half, on Tina's word ("were going
          for this one" against the horizontal-split mockup in
          price-card-layouts.html option 04) — so the number and the five
          things it actually buys sit side by side, instead of the number
          alone with everything it covers folded into one paragraph under
          it (the single-card version this replaces). */}
      <section
        className="mt-12 max-w-2xl mx-auto rounded-2xl overflow-hidden grid sm:grid-cols-2"
        style={{ background: '#fff', border: '1px solid var(--hairline)' }}
      >
        <div
          className="p-8 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--bone)', borderRight: '1px solid var(--hairline)' }}
        >
          <div className="eyebrow" style={{ color: 'var(--brass)' }}>One-time</div>
          <div className="mt-2 section-heading text-4xl" style={{ color: 'var(--aubergine)' }}>
            $99
          </div>
        </div>
        <div className="p-8">
          <ul className="grid gap-3">
            {[
              'Products imported & listed',
              'Your designers page',
              'Dedicated blog feature',
              'Instagram introduction post',
              'Affiliate program joined',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                <Check size={16} weight="bold" style={{ color: 'var(--brass)', flexShrink: 0, marginTop: 2 }} />
                {item}
              </li>
            ))}
          </ul>
          <p
            className="mt-4 pt-4 text-xs leading-relaxed"
            style={{ color: 'var(--muted)', borderTop: '1px solid var(--hairline)' }}
          >
            No subscription, nothing recurring. We only bring in women&rsquo;s clothing, hijabs,
            and layering pieces — other categories on your site won&rsquo;t be listed.
          </p>
        </div>
      </section>

      {/* "What we need from you" used to be its own aubergine section here.
          Tina: move that copy into "the get me listed stuff" instead — it
          now lives inside the popup itself (components/PartnerInterestDialog.tsx),
          right above the form it's telling you how to fill in, rather than
          sitting on the page disconnected from the form it's about. */}
      <div className="mt-12 text-center">
        <PartnerInterestDialog
          siteKey={siteKey}
          defaultTopic="partner"
          defaultMessage={DEFAULT_MESSAGE}
        />
      </div>
    </main>
  );
}
