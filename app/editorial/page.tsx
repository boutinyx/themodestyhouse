import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { getPosts, formatDate } from '@/lib/posts';
import { editorialVariant, editorialSrcSet } from '@/lib/staticImage';

export const metadata: Metadata = {
  title: 'The Edit',
  description: 'Stories, edits and styling from The Modesty House.',
  alternates: { canonical: '/editorial' },
};

export default function EditorialPage() {
  const posts = getPosts();
  return (
    <main className="max-w-[900px] mx-auto px-8 pt-32 md:pt-40 pb-24">
      <div className="text-center mb-14">
        <h1 className="serif mt-3" style={{ fontSize: 'clamp(36px,5.5vw,60px)', lineHeight: 1.02, color: 'var(--ink)' }}>The Edit</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>Stories, edits and styling from The Modesty House.</p>
      </div>

      <div>
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/editorial/${p.slug}`}
            /* `block` in the base, not only in the no-image branch. A <Link>
               renders an <a>, which is display:inline by default — so on a phone
               (below md, where the grid does not apply) these rows were INLINE
               boxes, and the `padding: 28px 0` and `border-top` below did
               nothing at all vertically. Measured at 390px: 8px between one
               row's "Read →" and the next row's photograph, against 19-21px
               INSIDE a row, so every element sat closer to the wrong neighbour
               and the link read as a caption for the next article's picture.
               The divider rules were invisible on phones for the same reason. */
            className={`group block items-center ${p.image ? 'md:grid md:grid-cols-[320px_1fr] md:gap-7' : ''}`}
            style={{ borderTop: '1px solid var(--hairline)', padding: '28px 0' }}
          >
            {p.image && (
              <div className="overflow-hidden rounded-xl mb-4 md:mb-0" style={{ aspectRatio: '16 / 10', background: 'var(--bone)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editorialVariant(p.image, 900) ?? p.image}
                  srcSet={editorialSrcSet(p.image)}
                  sizes="(max-width: 768px) 100vw, 40vw"
                  alt={p.imageAlt || ''}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div>
              <div className="eyebrow">{p.category} · {formatDate(p.date)}</div>
              <h2 className="serif mt-2" style={{ fontSize: 'clamp(24px,3.2vw,36px)', lineHeight: 1.08, color: 'var(--ink)' }}>{p.title}</h2>
              <p className="mt-2" style={{ color: 'var(--muted)', fontSize: 16, maxWidth: '62ch' }}>{p.dek}</p>
              {/* Phosphor, not the → character (CLAUDE.md §6). */}
              <div className="nav-link mt-3 inline-flex items-center gap-1.5">Read <ArrowRight size={12} weight="bold" /></div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
