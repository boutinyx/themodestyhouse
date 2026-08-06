import type { Metadata } from 'next';
import { Bodoni_Moda, Marcellus, Jost } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { QuickViewProvider } from '@/components/QuickView';
import './globals.css';

const display = Bodoni_Moda({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const label = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-label', display: 'swap' });
const ui = Jost({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://themodestyhouse.com'),
  title: 'The Modesty House — the archive for everything modest',
  description: 'The archive for everything modest. A curated index of modest brands and pieces.',
  openGraph: {
    title: 'The Modesty House',
    description: 'The archive for everything modest.',
    type: 'website',
    siteName: 'The Modesty House',
  },
  twitter: { card: 'summary_large_image', title: 'The Modesty House', description: 'The archive for everything modest.' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const skim = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  return (
    <html lang="en" className={`${display.variable} ${label.variable} ${ui.variable}`}>
      <body>
        <QuickViewProvider>
          <Header />
          {children}
          <Footer />
        </QuickViewProvider>
        {skim && (
          <Script src={`https://s.skimresources.com/js/${skim}.skimlinks.js`} strategy="afterInteractive" />
        )}
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
