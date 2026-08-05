import type { Metadata } from 'next';
import Link from 'next/link';
import { getPosts, formatDate } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'The Edit | The Modesty House',
  description: 'Stories, edits and styling from The Modesty House.',
};

export default function EditorialPage() {
  const posts = getPosts();
  return (
    <main className="max-w-[900px] mx-auto px-8 pt-32 pb-24">
      <div className="text-center mb-14">
        <div className="eyebrow">Editorial</div>
        <h1 className="serif mt-3" style={{ fontSize: 'clamp(36px,5.5vw,60px)', lineHeight: 1.02, color: 'var(--ink)' }}>The Edit</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>Stories, edits and styling from The Modesty House.</p>
      </div>

      <div>
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/editorial/${p.slug}`}
            className={`group items-center ${p.image ? 'md:grid md:grid-cols-[320px_1fr] md:gap-7' : 'block'}`}
            style={{ borderTop: '1px solid var(--hairline)', padding: '28px 0' }}
          >
            {p.image && (
              <div className="overflow-hidden rounded-xl mb-4 md:mb-0" style={{ aspectRatio: '16 / 10', background: 'var(--bone)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.imageAlt || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            )}
            <div>
              <div className="eyebrow">{p.category} · {formatDate(p.date)}</div>
              <h2 className="serif mt-2" style={{ fontSize: 'clamp(24px,3.2vw,36px)', lineHeight: 1.08, color: 'var(--ink)' }}>{p.title}</h2>
              <p className="mt-2" style={{ color: 'var(--muted)', fontSize: 16, maxWidth: '62ch' }}>{p.dek}</p>
              <div className="nav-link mt-3">Read →</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
