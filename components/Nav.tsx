'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VIBES } from '@/lib/vibes';
import { CATEGORY_LANES } from '@/lib/lanes';

function Dropdown({
  label,
  href,
  activeWhen,
  items,
  path,
}: {
  label: string;
  href?: string;
  activeWhen: boolean;
  items: { href: string; label: string }[];
  path: string;
}) {
  return (
    <div className="relative group">
      {href ? (
        <Link href={href} className="nav-link" data-active={activeWhen}>{label}</Link>
      ) : (
        <span className="nav-link cursor-default" data-active={activeWhen}>{label}</span>
      )}
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block z-50">
        <div
          className="rounded-2xl border p-2 min-w-[180px]"
          style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
        >
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block nav-link py-2 px-3 whitespace-nowrap"
              data-active={path === it.href}
            >
              {it.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const path = usePathname();
  const categoryItems = CATEGORY_LANES.map((l) => ({ href: `/${l.slug}`, label: l.title }));
  const styleItems = VIBES.map((v) => ({ href: `/style/${v.slug}`, label: v.title }));

  return (
    <nav className="flex items-center gap-5 md:gap-7">
      <Dropdown
        label="Directory"
        href="/directory"
        activeWhen={path === '/directory' || path.startsWith('/modest') || path.startsWith('/hijabi')}
        items={categoryItems}
        path={path}
      />
      <Dropdown label="Styles" activeWhen={path.startsWith('/style')} items={styleItems} path={path} />
      <Link href="/designers" className="nav-link" data-active={path.startsWith('/designers')}>Designers</Link>
      <Link href="/editorial" className="nav-link" data-active={path.startsWith('/editorial')}>Editorial</Link>
      <Link href="/about" className="nav-link" data-active={path.startsWith('/about')}>About</Link>
    </nav>
  );
}
