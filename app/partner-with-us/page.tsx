import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { PartnerFeatureAccordion, type PartnerFeature } from '@/components/PartnerFeatureAccordion';
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
const FEATURES: PartnerFeature[] = [
  {
    h: 'You show up where shoppers are already browsing',
    p: 'Not just your own page — your pieces sit in the real category grids people filter and scroll every day, and land in New In when they’re first added, seen by everyone browsing that day, not only people who already know your name.',
    images: [
      { src: '/partner-preview-category-2.jpg', alt: 'The Modesty House Abayas category page, showing filters and a full row of complete product photos from multiple houses', w: 1280, h: 920 },
      { src: '/partner-preview-newin-2.jpg', alt: 'The Modesty House New In page, showing a full row of the latest complete pieces added across houses', w: 1280, h: 1040 },
    ],
  },
  {
    h: 'A real page, not a listing',
    p: 'A designers page built around your brand — your story, your price range, your pieces. Here’s what a real one looks like today.',
    images: [{ src: '/partner-preview-designers.jpg', alt: 'Aab’s live designers page on The Modesty House, showing its description, piece count, price range and a Visit Aab button', w: 1280, h: 460 }],
  },
  {
    h: 'A backlink that helps you rank',
    p: 'When we feature your site, it’s a real link back to you — the kind Google counts toward your own ranking, not just traffic from ours.',
  },
  {
    h: 'An Instagram post people actually engage with',
    p: 'Not a passing mention — a post built so people understand who you are and trust you before they ever click through to buy.',
  },
  {
    h: 'Commission on everything above',
    p: 'We join your affiliate program — you only pay out on sales we actually send you. No program yet? Most Shopify stores can set one up in an afternoon with an app like UpPromote or Refersion, and we’re happy to point you to one.',
  },
];

const DEFAULT_MESSAGE = `Brand name & website:
What do you sell? (we only list women's clothing, hijabs, and layering pieces — other categories won't be included):
Based, and how long have you been running?:
Instagram handle:
`;

export default function PartnerWithUsPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <main className="max-w-4xl mx-auto px-8 pt-12 md:pt-20 pb-24">
      <div className="text-center max-w-2xl mx-auto">
        <div className="eyebrow" style={{ color: 'var(--brass)' }}>By invitation</div>
        <h1 className="section-heading text-4xl md:text-5xl mt-4">Partner with The Modesty House</h1>
        <p className="mt-5 text-lg leading-relaxed" style={{ color: 'var(--prose)' }}>
          A curated directory for aspirational, well-designed modest fashion. If you&rsquo;re
          here, it&rsquo;s because we&rsquo;ve already been through your catalogue and think it
          belongs in the directory.
        </p>
      </div>

      {/* "YOU WON'T BE LISTED ALONE" — pulled out of the accordion and given
          /about's own shape: Tina pointed at /about's MISSION-text-then-
          full-bleed-photo band and said do this one the same way. Text runs
          the full width (like /about's MISSION drops its narrow MEASURE),
          then a full-bleed image below it, breaking out of the page's own
          max-w-4xl via the standard `left-1/2 -translate-x-1/2 w-screen`
          technique (verified with Playwright at 390/1280/1920 — no
          horizontal scrollbar introduced).

          NOT `object-fit: cover` like /about's mashrabiya photo — that photo
          was composed to survive an arbitrary crop (its own comment: "the
          composition puts the lattice hard left... which is why it survives
          being cropped"). A screenshot of a product grid has no such
          slack — Tina already flagged once this session that a cropped
          screenshot reads as "cut in half". `object-fit: contain` at the
          image's own aspect ratio shows it whole; the aubergine sits behind
          it as letterboxing rather than as a crop that eats content. */}
      <section className="mt-14">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="section-heading text-2xl md:text-3xl">You won’t be listed alone</h2>
          <p className="mt-3 text-base md:text-lg leading-relaxed" style={{ color: 'var(--prose)' }}>
            Aab, Inayah, AbayaButh and 100+ other houses are already in the directory —
            verified, browsed, and selling. Your products sit in the same grids shoppers
            already trust.
          </p>
        </div>
        <div
          className="mt-8 w-screen relative left-1/2 -translate-x-1/2"
          style={{ background: 'var(--aubergine)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- one-off internal screenshot, not editorial photography (lib/staticImage.ts's convention is /editorial and /about only) */}
          <img
            src="/partner-preview-grid.jpg"
            alt="The Modesty House designers grid, showing Veiled, Aab, Summer Evenings, Inayah and Glow Modesty side by side, each verified"
            width={1280}
            height={560}
            loading="lazy"
            className="w-full mx-auto"
            style={{ maxWidth: 1280, aspectRatio: '1280 / 560', objectFit: 'contain' }}
          />
        </div>
      </section>

      {/* VALUE FIRST, price further down — SaaS pricing-page research is
          consistent on this: buyers want "is this worth it" answered before
          they see a number, and a bare price up top is what makes people
          bounce. Two of the five remaining features carry a REAL screenshot rather
          than a description, because "give them a feeling of what it's
          like" is best done by showing the actual thing.

          COLLAPSED BY DEFAULT — Tina: "i think its too long not only on
          laptop but also on phone... keep what we have but implement it in
          a different way". Same five features, same copy, same screenshots;
          nothing cut, just not all open on the page at once. See
          components/PartnerFeatureAccordion.tsx for why this isn't just
          HowBlocks reused. */}
      <div className="mt-12 max-w-2xl mx-auto">
        <PartnerFeatureAccordion features={FEATURES} />
      </div>

      {/* Price, de-emphasized relative to the v1 of this page — smaller
          numeral, framed with what it covers and an explicit "not a
          subscription" reassurance, which is the other half of what the
          research above recommends: once value is established, state the
          number plainly and concretely rather than hiding it. */}
      <section
        className="mt-12 max-w-md mx-auto rounded-2xl p-8 text-center"
        style={{ background: '#fff', border: '1px solid var(--hairline)' }}
      >
        <div className="eyebrow" style={{ color: 'var(--brass)' }}>To get all of the above</div>
        <div className="mt-2 section-heading text-4xl" style={{ color: 'var(--aubergine)' }}>
          $99 <span className="text-lg" style={{ color: 'var(--muted)' }}>one-time</span>
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
          No subscription, nothing recurring — one payment covers getting your products in,
          building your page, and the blog + Instagram feature above.
        </p>
        <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
          We only bring in women&rsquo;s clothing, hijabs, and layering pieces — other
          categories on your site won&rsquo;t be listed.
        </p>
      </section>

      <section
        className="mt-10 rounded-2xl p-8 md:p-10 max-w-2xl mx-auto"
        style={{ background: 'var(--aubergine)', color: 'var(--parchment)' }}
      >
        <h2 className="section-heading text-2xl md:text-3xl">What we need from you</h2>
        <p className="mt-2 text-base md:text-lg" style={{ opacity: 0.85 }}>
          Answer these four things in the message box below — that&rsquo;s all we need to get started.
        </p>
        <ol className="mt-6 space-y-3 text-base md:text-lg" style={{ listStyle: 'decimal', paddingLeft: 22 }}>
          <li>Your brand name &amp; website</li>
          <li>What you sell (women&rsquo;s clothing, hijabs, layering pieces only)</li>
          <li>Where you&rsquo;re based, and how long you&rsquo;ve been running</li>
          <li>Your Instagram handle</li>
        </ol>
        <p className="mt-6 text-base md:text-lg font-semibold">
          We&rsquo;ll follow up within a few days of hearing from you.
        </p>
      </section>

      <div className="mt-10 max-w-2xl mx-auto">
        <ContactForm
          siteKey={siteKey}
          defaultTopic="partner"
          defaultMessage={DEFAULT_MESSAGE}
        />
      </div>
    </main>
  );
}
