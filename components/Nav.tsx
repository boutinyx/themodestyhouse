'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VIBES } from '@/lib/vibes';

function active(href: string, path: string): boolean {
  if (href === '/') return path === '/' || path.startsWith('/modest') || path.startsWith('/hijabi');
  return path.startsWith(href);
}

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-5 md:gap-7">
      <Link href="/" className="nav-link" data-active={active('/', path)}>Directory</Link>

      {/* Styles dropdown */}
      <div className="relative group">
        <span className="nav-link cursor-default" data-active={path.startsWith('/style')}>Styles</span>
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block z-50">
          <div
            className="rounded-2xl border p-2 min-w-[170px]"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            {VIBES.map((v) => (
              <Link
                key={v.slug}
                href={`/style/${v.slug}`}
                className="block nav-link py-2 px-3 whitespace-nowrap"
                data-active={path === `/style/${v.slug}`}
              >
                {v.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Link href="/directory" className="nav-link" data-active={active('/directory', path)}>Designers</Link>
      <Link href="/editorial" className="nav-link" data-active={active('/editorial', path)}>Editorial</Link>
      <Link href="/about" className="nav-link" data-active={active('/about', path)}>About</Link>
    </nav>
  );
}
