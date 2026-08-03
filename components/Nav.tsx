'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { label: 'Directory', href: '/' },
  { label: 'Editorial', href: '/editorial' },
  { label: 'Designers', href: '/directory' },
  { label: 'About', href: '/about' },
];

function isActive(href: string, path: string): boolean {
  if (href === '/') {
    return path === '/' || path.startsWith('/modest') || path.startsWith('/hijabi');
  }
  return path.startsWith(href);
}

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-5 md:gap-7">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className="nav-link" data-active={isActive(it.href, path)}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
