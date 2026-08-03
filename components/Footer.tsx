import Link from 'next/link';
import { PinterestLogo, InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';
import { LANES } from '@/lib/lanes';

export function Footer() {
  return (
    <footer className="aubergine-band mt-24" style={{ color: 'var(--parchment)' }}>
      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="wordmark text-lg" style={{ color: 'var(--parchment)' }}>The Modesty House</div>
            <p className="text-sm mt-3" style={{ color: '#d9c7d6' }}>The archive for everything modest.</p>
          </div>
          <div>
            <div className="eyebrow" style={{ color: '#c9b2c4' }}>Shop</div>
            <ul className="mt-4 space-y-2 text-sm">
              {LANES.map((l) => (
                <li key={l.slug}>
                  <Link href={`/${l.slug}`} className="hover:opacity-70 transition" style={{ color: 'var(--parchment)' }}>
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="eyebrow" style={{ color: '#c9b2c4' }}>The House</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/directory" className="hover:opacity-70 transition" style={{ color: 'var(--parchment)' }}>Designers</Link></li>
              <li><Link href="/editorial" className="hover:opacity-70 transition" style={{ color: 'var(--parchment)' }}>Editorial</Link></li>
              <li><Link href="/about" className="hover:opacity-70 transition" style={{ color: 'var(--parchment)' }}>About</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow" style={{ color: '#c9b2c4' }}>Follow</div>
            <div className="flex gap-4 mt-4">
              <a href="https://pinterest.com" aria-label="Pinterest" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition"><PinterestLogo size={22} /></a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition"><InstagramLogo size={22} /></a>
              <a href="https://tiktok.com" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition"><TiktokLogo size={22} /></a>
            </div>
          </div>
        </div>
        <div className="text-center mt-14 pt-8" style={{ borderTop: '1px solid rgba(243,238,228,0.16)' }}>
          <div className="serif italic text-2xl" style={{ color: 'var(--parchment)' }}>
            The archive for everything modest.
          </div>
          <div className="eyebrow mt-3" style={{ color: '#c9b2c4' }}>themodestyhouse.com</div>
        </div>
      </div>
    </footer>
  );
}
