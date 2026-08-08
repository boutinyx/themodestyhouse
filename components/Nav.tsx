'use client';
import { usePathname } from 'next/navigation';
import { CATEGORY_LANES } from '@/lib/lanes';
import { NavMenu } from './NavMenu';

export function Nav() {
  const path = usePathname();
  const categoryItems = CATEGORY_LANES.map((l) => ({ href: `/${l.slug}`, label: l.title }));

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
