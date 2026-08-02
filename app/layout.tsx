import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-display',
  display: 'swap',
});
const ui = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

export const metadata: Metadata = {
  title: 'The Modest House',
  description: 'Modest style, for everyone — a curated edit of modest fashion.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const skim = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
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
