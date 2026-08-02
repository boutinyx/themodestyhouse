import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { LANES } from '@/lib/lanes';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Modest House',
  description: 'Curated modest fashion — dresses, hijab, swimwear and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const skim = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  return (
    <html lang="en">
      <body>
        <header className="border-b">
          <nav className="max-w-6xl mx-auto flex flex-wrap gap-4 p-4 text-sm items-center">
            <Link href="/" className="font-semibold">The Modest House</Link>
            {LANES.map((l) => (
              <Link key={l.slug} href={`/${l.slug}`}>{l.title}</Link>
            ))}
          </nav>
        </header>
        {children}
        {skim && (
          <Script src={`https://s.skimresources.com/js/${skim}.skimlinks.js`} strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
