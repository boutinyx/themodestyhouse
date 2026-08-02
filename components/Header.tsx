import Link from 'next/link';
import { LANES } from '@/lib/lanes';
import { VibeToggle } from './VibeToggle';

export function Header() {
  return (
    <header className="border-b" style={{ borderColor: 'var(--hairline)' }}>
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="leading-none">
          <div className="wordmark text-base md:text-lg">The Modest House</div>
          <div className="eyebrow mt-1">by the tina aesthetic</div>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {LANES.map((l) => (
            <Link key={l.slug} href={`/${l.slug}`} className="nav-link">{l.nav}</Link>
          ))}
        </nav>
        <VibeToggle />
      </div>
      <nav className="md:hidden flex items-center gap-5 px-5 pb-3 overflow-x-auto">
        {LANES.map((l) => (
          <Link key={l.slug} href={`/${l.slug}`} className="nav-link whitespace-nowrap">{l.nav}</Link>
        ))}
      </nav>
    </header>
  );
}
