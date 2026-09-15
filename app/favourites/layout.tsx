import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/schema';

// page.tsx is 'use client' (localStorage-driven), so it cannot export
// metadata itself — a crawler only ever sees the empty state, and
// sitemap.ts already documents that this route "wants a noindex (which it
// does not yet have)". This layout is the fix.
export const metadata: Metadata = {
  title: 'Favourites',
  robots: { index: false, follow: true },
  // Self-canonical, for the same reason as app/product/[brandSlug]/[shopifyId]:
  // the noindex is the indexing decision, the canonical just states which URL
  // this content lives at. The two pages were the only ones in Inoma Digital's
  // 2026-09-11 crawl with no canonical tag at all.
  alternates: { canonical: `${SITE_URL}/favourites` },
};

export default function FavouritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
