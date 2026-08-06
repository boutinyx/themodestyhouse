import Link from 'next/link';
import { PinterestLogo, InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';
import { CATEGORY_LANES } from '@/lib/lanes';

function Col({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: 'var(--brass)' }}>{head}</div>
      <ul className="mt-4 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:opacity-100 transition" style={{ color: '#b9ad9c' }}>
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: '#b9ad9c', marginTop: 80 }}>
      <div className="max-w-[1220px] mx-auto px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="wordmark text-lg" style={{ color: 'var(--parchment)' }}>The Modesty House</div>
            <p className="mt-3 text-sm max-w-xs" style={{ color: '#8a7d6b' }}>
              A curated index of modest fashion houses — vetted for craft and taste.
            </p>
            <div className="flex items-center gap-4 mt-5" style={{ color: '#b9ad9c' }}>
              <a href="https://pinterest.com" aria-label="Pinterest" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition"><PinterestLogo size={20} /></a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition"><InstagramLogo size={20} /></a>
              <a href="https://tiktok.com" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition"><TiktokLogo size={20} /></a>
            </div>
          </div>

          <Col head="Directory">
            {CATEGORY_LANES.slice(0, 6).map((l) => (
              <FLink key={l.slug} href={`/${l.slug}`}>{l.title}</FLink>
            ))}
          </Col>

          <Col head="Editorial">
            <FLink href="/editorial">The Edit</FLink>
            <FLink href="/editorial">Guides</FLink>
            <FLink href="/editorial">Interviews</FLink>
          </Col>

          <div>
            <div className="eyebrow" style={{ color: 'var(--brass)' }}>The House</div>
            <ul className="mt-4 space-y-2 text-sm">
              <FLink href="/designers">Designers</FLink>
              <FLink href="/about">About</FLink>
              <FLink href="/favourites">Favourites</FLink>
              <FLink href="/contact?topic=seal">Apply for the seal</FLink>
              <FLink href="/contact">Contact</FLink>
            </ul>

            {/* The newsletter needs subscriber storage, double opt-in and an
                unsubscribe flow before it can exist — see docs/email-service-plan.md.
                Until then this points at the contact form rather than a form that
                silently does nothing. */}
            <div className="mt-7">
              <div className="eyebrow" style={{ color: 'var(--brass)' }}>The Edit, in your inbox</div>
              <p className="mt-2 text-sm" style={{ color: 'rgba(243,238,228,0.7)' }}>
                Coming soon. In the meantime, <FLink href="/contact">write to us</FLink>.
              </p>
            </div>
          </div>
        </div>

        {/* FTC / EU affiliate disclosure. Must stay site-wide and visible without
            interaction — it is the disclosure a regulator looks for first. */}
        <div
          className="mt-14 pt-6"
          style={{ borderTop: '1px solid rgba(243,238,228,0.12)', color: '#8a7d6b', fontSize: 12, lineHeight: 1.6, maxWidth: 720 }}
        >
          The Modesty House is a discovery and affiliate site — we don&rsquo;t sell anything
          ourselves. Some links may be affiliate links, and if you buy through one we may earn a
          commission at no extra cost to you. Prices are shown in each brand&rsquo;s own
          currency and can change; always check the brand&rsquo;s site before buying.{' '}
          <Link href="/terms" style={{ color: '#c8bda9', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Full disclosure
          </Link>
          .
        </div>

        <div className="mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(243,238,228,0.12)' }}>
          <div className="eyebrow" style={{ color: '#8a7d6b' }}>© 2026 The Modesty House · themodestyhouse.com</div>
          <div className="eyebrow flex items-center gap-3" style={{ color: '#8a7d6b' }}>
            <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
