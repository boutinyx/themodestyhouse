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

// OG/Twitter image is the existing hero photograph, reused rather than a
// new asset invented for this — no brand-new art without Tina's say (§10.18
// is about copy, but the same principle applies to imagery).
const DEFAULT_OG_IMAGE = '/hero-poster.jpg';

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
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Modesty House',
    description: 'The archive for everything modest.',
    images: [DEFAULT_OG_IMAGE],
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
      </body>
    </html>
  );
}
