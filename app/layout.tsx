import type { Metadata } from 'next';
import { Bodoni_Moda, Marcellus, Jost } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import './globals.css';

const display = Bodoni_Moda({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const label = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-label', display: 'swap' });
const ui = Jost({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

export const metadata: Metadata = {
  title: 'The Modesty House — the archive for everything modest',
  description: 'The archive for everything modest. A curated index of modest brands and pieces.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const skim = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  return (
    <html lang="en" className={`${display.variable} ${label.variable} ${ui.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
        {skim && (
          <Script src={`https://s.skimresources.com/js/${skim}.skimlinks.js`} strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
