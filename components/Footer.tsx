import { PinterestLogo, InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';

export function Footer() {
  return (
    <footer className="aubergine-band mt-24">
      <div className="max-w-6xl mx-auto px-5 py-16 text-center">
        <div className="serif italic text-3xl md:text-4xl" style={{ color: 'var(--parchment)' }}>
          &ldquo;Where modest fashion is found.&rdquo;
        </div>
        <div className="wordmark text-lg mt-8" style={{ color: 'var(--parchment)' }}>
          The Modesty House
        </div>
        <div className="flex items-center justify-center gap-5 mt-5" style={{ color: 'var(--parchment)' }}>
          <a href="https://pinterest.com" aria-label="Pinterest" target="_blank" rel="noopener noreferrer"><PinterestLogo size={22} /></a>
          <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><InstagramLogo size={22} /></a>
          <a href="https://tiktok.com" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><TiktokLogo size={22} /></a>
        </div>
        <div className="eyebrow mt-8" style={{ color: '#c9b2c4' }}>themodestyhouse.com</div>
      </div>
    </footer>
  );
}
