import { PinterestLogo, InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';

export function Footer() {
  return (
    <footer className="aubergine-band mt-24">
      <div className="max-w-6xl mx-auto px-5 py-16 text-center">
        <div className="serif italic text-3xl md:text-4xl" style={{ color: '#f4ecef' }}>
          Let&rsquo;s connect
        </div>
        <div className="wordmark text-lg mt-6" style={{ color: '#f4ecef' }}>
          The Modest House
        </div>
        <div className="eyebrow mt-2" style={{ color: '#d9c7d6' }}>by the tina aesthetic</div>
        <div className="flex items-center justify-center gap-5 mt-6" style={{ color: '#f4ecef' }}>
          <a href="https://pinterest.com" aria-label="Pinterest" target="_blank" rel="noopener noreferrer"><PinterestLogo size={22} /></a>
          <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><InstagramLogo size={22} /></a>
          <a href="https://tiktok.com" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><TiktokLogo size={22} /></a>
        </div>
        <div className="eyebrow mt-10" style={{ color: '#b79bb3' }}>modest style, for everyone</div>
      </div>
    </footer>
  );
}
