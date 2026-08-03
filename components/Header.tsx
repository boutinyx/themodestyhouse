import Link from 'next/link';
import { Nav } from './Nav';

export function Header() {
  return (
    <header className="px-4 pt-4">
      <div
        className="max-w-6xl mx-auto flex items-center justify-between gap-6 pl-5 pr-6 py-3 rounded-[28px] border"
        style={{ borderColor: 'var(--hairline)', background: 'var(--bone)' }}
      >
        <Link href="/" className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Modesty House crest" className="h-12 w-auto" />
          <span aria-hidden className="block w-px h-10" style={{ background: 'var(--hairline)' }} />
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--font-label), serif',
              color: 'var(--aubergine)',
              letterSpacing: '0.22em',
              lineHeight: 1.3,
              fontSize: '12px',
            }}
          >
            The&nbsp;Modesty
            <br />
            House
          </span>
        </Link>
        <div className="hidden md:block">
          <Nav />
        </div>
      </div>
      <div className="md:hidden px-5 pt-3 overflow-x-auto">
        <Nav />
      </div>
    </header>
  );
}
