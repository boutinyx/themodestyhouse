import type { Brand } from '@/lib/types';

export function BrandCard({ b }: { b: Brand }) {
  return (
    <a
      href={b.homepage}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="product-card flex items-center justify-between gap-4 px-5 py-4"
    >
      <div>
        <div className="section-heading text-xl">{b.name}</div>
        <div className="brand-label mt-1">{b.category} · {b.city}</div>
      </div>
      {b.badge === 'verified' && <span className="badge">✦ Verified</span>}
      {b.badge === 'editors-pick' && <span className="badge">✦ Editor&rsquo;s Pick</span>}
      {!b.badge && <span className="nav-link">View →</span>}
    </a>
  );
}
