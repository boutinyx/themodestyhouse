import Link from 'next/link';
import { LANES } from '@/lib/lanes';

export function Header() {
  return (
    <header className="border-b" style={{ borderColor: 'var(--hairline)' }}>
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 leading-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Modesty House crest" className="h-11 w-auto" />
          <span>
            <span className="wordmark block text-base md:text-lg">The Modesty House</span>
            <span className="eyebrow block mt-1">The Modest Fashion Directory</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/directory" className="nav-link">Designers</Link>
          {LANES.map((l) => (
            <Link key={l.slug} href={`/${l.slug}`} className="nav-link">{l.nav}</Link>
          ))}
        </nav>
      </div>
      <nav className="md:hidden flex items-center gap-5 px-5 pb-3 overflow-x-auto">
        <Link href="/directory" className="nav-link whitespace-nowrap">Designers</Link>
        {LANES.map((l) => (
          <Link key={l.slug} href={`/${l.slug}`} className="nav-link whitespace-nowrap">{l.nav}</Link>
        ))}
      </nav>
    </header>
  );
}
