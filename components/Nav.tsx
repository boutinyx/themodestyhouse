'use client';
import { usePathname } from 'next/navigation';
import { CATEGORY_LANES } from '@/lib/lanes';
import {
  OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, HIJAB_SUBTYPE_LABELS,
  type OuterwearSubtype, type LayeringSubtype, type HijabSubtype,
} from '@/lib/specialty';
import { NavMenu, type NavItem } from './NavMenu';

// Fixed order, matching the Type filter's own canonical order
// (lib/specialty.ts) rather than object key iteration order.
const OUTERWEAR_SUBTYPES: OuterwearSubtype[] = ['blazer', 'vest', 'cardigan', 'coat'];
// Insertion order of the LAYERING_SUBTYPE_LABELS/HIJAB_SUBTYPE_LABELS object
// literals — same source components/FilterableGrid.tsx and
// lib/compactCatalogue.ts read.
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
const HIJAB_SUBTYPES = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];

export function Nav() {
  const path = usePathname();
  const categoryItems: NavItem[] = CATEGORY_LANES.map((l) => ({
    href: `/${l.slug}`,
    label: l.title,
    // Outerwear got a hover flyout to its four subtypes 2026-08-13; Layering
    // Basics got the same treatment 2026-08-15 morning (Tina: "i want the
    // sub catagories of layering basics to be like outerwear sub
    // catagories... i want to be able to click them"); Hijabs & Scarves got
    // it that same evening (Tina: "i want a dropdown that give khimars and
    // jilbabs undercap et etc"). Each pre-filters the destination page via
    // ?type=, read by app/[lane]/page.tsx and threaded into FilterableGrid.
    // The in-page "Type" dropdown that used to be Layering Basics's only way
    // to filter by subtype is gone the same day, matching what happened to
    // Outerwear's — see components/FilterableGrid.tsx.
    // Every flyout row below leads with an "All X" entry linking to the
    // BARE lane page (no ?type=) — added 2026-08-15, after Tina: "i cant
    // click on hijabs and scarfes now and also not outterwear". A row with
    // subItems renders as a Menu.Trigger, not a Link (see NavMenu.tsx's own
    // comment on why — a Link+Trigger touch race, deliberate), so clicking
    // the row itself has NEVER navigated anywhere since Outerwear got this
    // treatment 2026-08-13 — it only opens the flyout. That was fine while
    // the flyout's sub-items were the only thing anyone wanted, but it means
    // there was no way to reach the unfiltered, everything-in-this-category
    // view at all. This "All X" item is that path, without reintroducing the
    // Link-on-the-row race the flyout was built to avoid.
    ...(l.slug === 'outerwear'
      ? {
          subItems: [
            { href: '/outerwear', label: 'All Outerwear' },
            ...OUTERWEAR_SUBTYPES.map((t) => ({
              href: `/outerwear?type=${t}`,
              label: OUTERWEAR_SUBTYPE_LABELS[t],
            })),
          ],
        }
      : {}),
    ...(l.slug === 'layering-basics'
      ? {
          subItems: [
            { href: '/layering-basics', label: 'All Layering Basics' },
            ...LAYERING_SUBTYPES.map((t) => ({
              href: `/layering-basics?type=${t}`,
              label: LAYERING_SUBTYPE_LABELS[t],
            })),
          ],
        }
      : {}),
    ...(l.slug === 'modest-hijabs'
      ? {
          subItems: [
            { href: '/modest-hijabs', label: 'All Hijabs & Scarves' },
            ...HIJAB_SUBTYPES.map((t) => ({
              href: `/modest-hijabs?type=${t}`,
              label: HIJAB_SUBTYPE_LABELS[t],
            })),
          ],
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
