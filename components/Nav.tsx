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
          label: 'Directory',
          href: '/directory',
          activeWhen: path === '/directory' || path.startsWith('/modest') || path.startsWith('/hijabi'),
          items: categoryItems,
          // 9 categories in one column was a very tall menu. Asking for 2 rows
          // makes it a wide, shallow panel: the column count is derived, so this
          // stays 2 rows if a category is added.
          rows: 2,
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
