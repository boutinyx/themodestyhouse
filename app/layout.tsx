import type { Metadata } from 'next';
import { Bodoni_Moda, Marcellus, Jost } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/Header';
import { HeroBrandStrip } from '@/components/HeroBrandStrip';
import { Footer } from '@/components/Footer';
import { QuickViewProvider } from '@/components/QuickView';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { StaffSessionProvider } from '@/components/StaffSessionProvider';
import { hasStaffSession } from '@/lib/staffSession';
import { OutboundTracking } from '@/components/OutboundTracking';
import { InputModality } from '@/components/InputModality';
import { JsonLd } from '@/components/JsonLd';
import { organizationSchema, websiteSchema, jsonLdGraph } from '@/lib/schema';
import './globals.css';

const display = Bodoni_Moda({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const label = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-label', display: 'swap' });
const ui = Jost({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

/*
 * The share card. 1200x630, the size every platform expects.
 *
 * Was /hero-poster.jpg until 2026-09-07 — a video poster frame from 3 August,
 * a cropped street photo of one person on a bridge, with nothing on it saying
 * whose link it was. Tina, sending a screenshot of a WhatsApp share: "we need
 * to change the og image becuase its not good right now when i send my oage to
 * someone a old picture comes this one ... and that isnt the right one."
 *
 * A NEW FILENAME, never a replacement of the old path. public/ is served with
 * `cache-control: max-age=14400` and Next does not fingerprint these paths
 * (§6, §10.21) — and every social platform caches an og:image by URL and is
 * far more stubborn than a browser. New bytes at /hero-poster.jpg would have
 * left the bridge photo in circulation indefinitely. /hero-poster.jpg is now
 * referenced by nothing and is left on disk rather than deleted.
 *
 * Built from assets that are already hers: the live homepage hero
 * (hero-home-10.jpg), public/logo.png, Bodoni Moda + Marcellus, the brass
 * rule, and the tagline the layout's own description already carried. Nothing
 * commissioned or invented. She chose this over three alternatives.
 *
 * WIDTH AND HEIGHT ARE DECLARED. Without them WhatsApp and LinkedIn fetch the
 * file before deciding whether it earns a large card, and often fall back to
 * the small thumbnail on the first share of a new URL.
 */
const DEFAULT_OG_IMAGE = '/og-card-1.jpg';
const OG_ALT = 'The Modesty House — the archive for everything modest';

export const metadata: Metadata = {
  metadataBase: new URL('https://themodestyhouse.com'),
  title: {
    default: 'The Modesty House — the archive for everything modest',
    template: '%s | The Modesty House',
  },
  description: 'The archive for everything modest. A curated index of modest brands and pieces.',
  openGraph: {
    title: 'The Modesty House',
    description: 'The archive for everything modest.',
    type: 'website',
    siteName: 'The Modesty House',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Modesty House',
    description: 'The archive for everything modest.',
    images: [DEFAULT_OG_IMAGE],
  },
  // Pinterest domain claim for @thetinaesthetic. Claiming is what gives every
  // pin of this site's content the brand's name and unlocks per-domain
  // analytics — without it Pinterest reports nothing about outbound clicks,
  // which is why the 105k monthly impressions were unattributable
  // (docs/log/2026-09-12-instagram-strategy-review.md, second addendum).
  // This is a verification token only: it sets no cookie and loads no script.
  verification: {
    other: { 'p:domain_verify': '17d9fbb4074bf07f4b68b59603ff2475' },
  },
};

// Same-origin prefetch for the header/footer's own links (nav, footer
// category lanes) — Speculation Rules API, native browser support, no JS
// cost. "moderate" eagerness prefetches on hover/focus rather than for
// every link on the page. See docs/log/2026-08-11-seo-geo-aeo-phase1.md.
const SPECULATION_RULES = {
  prefetch: [
    {
      source: 'document',
      where: { and: [{ href_matches: '/*' }, { not: { href_matches: '/api/*' } }, { not: { href_matches: '/admin/*' } }] },
      eagerness: 'moderate',
    },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const skim = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  // Reads the staff session cookie on every request, so the root layout —
  // and therefore every page — opts out of static prerendering. Confirmed
  // with Tina (docs/superpowers/plans/2026-08-12-inline-staff-editing.md,
  // Task 4): the simplest correct approach, accepted at this site's scale.
  const isStaff = await hasStaffSession();
  return (
    <html lang="en-GB" className={`${display.variable} ${label.variable} ${ui.variable}`}>
      <head>
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SPECULATION_RULES) }}
        />
      </head>
      <body>
        <JsonLd data={jsonLdGraph(organizationSchema(), websiteSchema())} />
        <StaffSessionProvider isStaff={isStaff}>
        <CurrencyProvider>
        <QuickViewProvider>
          {/* ABOVE the header, on every page — Tina, 2026-08-23: "i want the
              banner a dark purple almost black and i want it above the
              header". It sat under the homepage hero for a few hours before
              this; "above the header" can only be honoured from the layout,
              since the header itself lives here, and that necessarily makes it
              site-wide rather than homepage-only.

              Deliberately NOT sticky. The header is what has to stay reachable
              while scrolling; a second pinned bar would eat 40px of every
              viewport for a decorative ticker, and `--header-height` (which
              .hero-vh subtracts) measures the header alone. It scrolls away and
              the header takes the top edge, which is how an announcement bar
              behaves everywhere else.

              This is also the black announcement bar Header.tsx's own comment
              says was left out of the reference layout for want of anything
              real to put in it. There is now something real: the house names. */}
          <HeroBrandStrip tone="band" />
          <Header />
          {children}
          <Footer />
        </QuickViewProvider>
        </CurrencyProvider>
        </StaffSessionProvider>
        {skim && (
          <Script src={`https://s.skimresources.com/js/${skim}.skimlinks.js`} strategy="afterInteractive" />
        )}
        <InputModality />
        {/* Records a Pulse `outbound_click` when a visitor leaves for a brand —
            one delegated listener, so the server components that render outbound
            links stay server components. Inert until the script below loads. */}
        <OutboundTracking />
        {/* Pulse — first-party audience measurement (ciphera.net).
            Cookieless: no document.cookie, no persistent visitor id. localStorage
            holds only a self-exclusion flag, sessionStorage only a per-session
            pageview dedup record. Honours doNotTrack and globalPrivacyControl.
            Disclosed in content/legal/privacy.md §2/§4/§5 — keep those in sync.

            PRODUCTION ONLY. Unlike Plausible, this script has no built-in
            localhost exclusion (verified: 0 occurrences of "localhost" in
            script.js), so without this gate every `npm run dev` page view would
            be counted. Gated on NODE_ENV rather than a NEXT_PUBLIC_* var
            deliberately: NEXT_PUBLIC_* is inlined at build time and is exactly
            what left NEXT_PUBLIC_SKIMLINKS_ID unset on Railway for weeks.

            CSP: js.ciphera.net is in script-src and pulse-api.ciphera.net is in
            connect-src (next.config.ts). The script and its event endpoint are
            DIFFERENT hosts — allowlisting only the former loads the script and
            silently drops every event. */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            data-domain="themodestyhouse.com"
            src="https://js.ciphera.net/script.js"
            strategy="afterInteractive"
          />
        )}
        {/* Pulse interaction capture — the SECOND tag the dashboard's snippet
            emits once "Interaction capture" is on. That toggle has been on in
            the Pulse settings while this tag was absent, so `pulse_click`,
            `pulse_copy` and `pulse_form_submit` were enabled server-side and
            never sent. The setting alone does nothing; it is this file that
            collects.

            Emits three events and nothing else, with the redaction done in the
            BROWSER before anything is sent (read out of script.interactions.js,
            not from the marketing copy): a click sends the element's aria-label
            or text, trimmed to 60 chars with emails rewritten to `[email]` and
            digit runs to `[number]`; a copy sends how much was copied, never
            what; a form submit sends the form's name and its field COUNT, never
            a value or a field name. `data-pulse-ignore` on any element opts its
            subtree out — the escape hatch for anything that might carry a
            person's own text.

            Loads after the main tag because it calls `window.pulse.track`. It
            reads that at EVENT time rather than load time, so the two tags do
            not have to win a race — but an event fired before the main script
            arrives is silently dropped, which is the one failure mode to know
            about.

            No CSP change: js.ciphera.net is already in script-src and the
            events leave through the main script's existing pulse-api.ciphera.net
            connection (next.config.ts).

            Disclosed in content/legal/privacy.md §2/§4 alongside the main
            script — keep those in sync, same as the tag above. */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            src="https://js.ciphera.net/script.interactions.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
