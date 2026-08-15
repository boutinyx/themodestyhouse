'use client';
import { usePathname } from 'next/navigation';
import { CATEGORY_LANES } from '@/lib/lanes';
import { OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, type OuterwearSubtype, type LayeringSubtype } from '@/lib/specialty';
import { NavMenu, type NavItem } from './NavMenu';

// Fixed order, matching the Type filter's own canonical order
// (lib/specialty.ts) rather than object key iteration order.
const OUTERWEAR_SUBTYPES: OuterwearSubtype[] = ['blazer', 'vest', 'cardigan', 'coat'];
// Insertion order of the LAYERING_SUBTYPE_LABELS object literal — same
// source components/FilterableGrid.tsx and lib/compactCatalogue.ts read.
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];

export function Nav() {
  const path = usePathname();
  const categoryItems: NavItem[] = CATEGORY_LANES.map((l) => ({
    href: `/${l.slug}`,
    label: l.title,
    // Outerwear got a hover flyout to its four subtypes 2026-08-13; Layering
    // Basics got the same treatment 2026-08-15 (Tina: "i want the sub
    // catagories of layering basics to be like outerwear sub catagories...
    // i want to be able to click them") — each pre-filters the destination
    // page via ?type=, read by app/[lane]/page.tsx and threaded into
    // FilterableGrid. The in-page "Type" dropdown that used to be Layering
    // Basics's only way to filter by subtype is gone the same day, matching
    // what happened to Outerwear's — see components/FilterableGrid.tsx.
    ...(l.slug === 'outerwear'
      ? {
          subItems: OUTERWEAR_SUBTYPES.map((t) => ({
            href: `/outerwear?type=${t}`,
            label: OUTERWEAR_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
    ...(l.slug === 'layering-basics'
      ? {
          subItems: LAYERING_SUBTYPES.map((t) => ({
            href: `/layering-basics?type=${t}`,
            label: LAYERING_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
  }));

  return (
    <NavMenu
      path={path}
      groups={[
        {
          label: 'Products',
          href: '/directory',
          activeWhen: path === '/directory' || path.startsWith('/modest') || path.startsWith('/hijabi'),
          items: categoryItems,
          // Two columns, each read top-to-bottom: 9 categories split 5 + 4.
          // The row count is derived from the item count, so adding a category
          // lengthens the columns rather than breaking the shape.
          columns: 2,
          flow: 'down',
        },
        // A second group, "Styles", listed the three /style/[vibe] aesthetic
        // pages until 2026-08-09, when that feature was removed at Tina's
        // request — see docs/log/2026-08-09-remove-style-vibe-feature.md.
        // `groups` is still an array because NavMenu is built for N groups and
        // a future one (Occasion, say) drops straight in.
      ]}
      links={[
        { href: '/designers', label: 'Designers', activeWhen: path.startsWith('/designers') },
        { href: '/editorial', label: 'Editorial', activeWhen: path.startsWith('/editorial') },
        { href: '/about', label: 'About', activeWhen: path.startsWith('/about') },
      ]}
    />
  );
}
