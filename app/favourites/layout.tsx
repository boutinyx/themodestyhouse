import type { Metadata } from 'next';

// page.tsx is 'use client' (localStorage-driven), so it cannot export
// metadata itself — a crawler only ever sees the empty state, and
// sitemap.ts already documents that this route "wants a noindex (which it
// does not yet have)". This layout is the fix.
export const metadata: Metadata = {
  title: 'Favourites',
  robots: { index: false, follow: true },
};

export default function FavouritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
