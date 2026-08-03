import Link from 'next/link';
import { LANES } from '@/lib/lanes';

export function Header() {
  return (
    <header className="px-4 pt-4">
      <div
        className="max-w-6xl mx-auto flex items-center justify-between gap-6 pl-5 pr-6 py-3 rounded-[28px] border"
        style={{ borderColor: 'var(--hairline)', background: 'var(--bone)' }}
      >
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Modesty House crest" className="h-10 w-auto" />
          <span className="wordmark text-lg md:text-xl">The Modesty House</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/directory" className="nav-link">Designers</Link>
          {LANES.map((l) => (
            <Link key={l.slug} href={`/${l.slug}`} className="nav-link">{l.nav}</Link>
          ))}
        </nav>
      </div>
      <nav className="md:hidden flex items-center gap-5 px-5 pt-3 overflow-x-auto">
        <Link href="/directory" className="nav-link whitespace-nowrap">Designers</Link>
        {LANES.map((l) => (
          <Link key={l.slug} href={`/${l.slug}`} className="nav-link whitespace-nowrap">{l.nav}</Link>
        ))}
      </nav>
    </header>
  );
}
