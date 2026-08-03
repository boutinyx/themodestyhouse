import Link from 'next/link';
import { Nav } from './Nav';

export function Header() {
  return (
    <header className="border-b" style={{ borderColor: 'var(--hairline)' }}>
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Modesty House crest" className="h-10 w-auto" />
          <span className="wordmark text-xl md:text-2xl">The Modesty House</span>
        </Link>
        <div className="hidden md:block">
          <Nav />
        </div>
      </div>
      <div className="md:hidden px-5 pb-3 overflow-x-auto">
        <Nav />
      </div>
    </header>
  );
}
