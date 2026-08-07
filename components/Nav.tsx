'use client';
import { usePathname } from 'next/navigation';
import { VIBES } from '@/lib/vibes';
import { CATEGORY_LANES } from '@/lib/lanes';
import { NavMenu } from './NavMenu';

export function Nav() {
  const path = usePathname();
  const categoryItems = CATEGORY_LANES.map((l) => ({ href: `/${l.slug}`, label: l.title }));
  const styleItems = VIBES.map((v) => ({ href: `/style/${v.slug}`, label: v.title }));

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
        {
          label: 'Styles',
          activeWhen: path.startsWith('/style'),
          items: styleItems,
        },
      ]}
      links={[
        { href: '/designers', label: 'Designers', activeWhen: path.startsWith('/designers') },
        { href: '/editorial', label: 'Editorial', activeWhen: path.startsWith('/editorial') },
        { href: '/about', label: 'About', activeWhen: path.startsWith('/about') },
      ]}
    />
  );
}
