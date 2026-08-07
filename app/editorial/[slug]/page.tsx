import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, getPosts, formatDate } from '@/lib/posts';
import { Markdown } from '@/components/Markdown';
import { editorialVariant, editorialSrcSet } from '@/lib/staticImage';

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) return { title: 'Not found | The Modesty House' };
  return { title: `${p.title} | The Modesty House`, description: p.dek };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();

  return (
    <main className="max-w-[720px] mx-auto px-6 pt-32 pb-24">
      <Link href="/editorial" className="nav-link">← The Edit</Link>

      {p.image && (
        <div className="mt-6 overflow-hidden rounded-2xl" style={{ background: 'var(--bone)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={editorialVariant(p.image, 900) ?? p.image}
            srcSet={editorialSrcSet(p.image)}
            sizes="(max-width: 768px) 100vw, 720px"
            alt={p.imageAlt || ''}
            className="w-full object-cover"
            style={{ aspectRatio: '16 / 9' }}
            decoding="async"
          />
        </div>
      )}

      <div className="eyebrow mt-10">{p.category}</div>
      <h1 className="serif mt-3" style={{ fontSize: 'clamp(32px,5.2vw,54px)', lineHeight: 1.03, color: 'var(--ink)' }}>{p.title}</h1>
      <p className="mt-4" style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1.5 }}>{p.dek}</p>
      <div className="eyebrow mt-5" style={{ color: 'var(--muted)' }}>{p.author} · {formatDate(p.date)}</div>

      <hr style={{ border: 0, borderTop: '1px solid var(--hairline)', margin: '32px 0' }} />

      <article>
        <Markdown body={p.body} />
      </article>

      <div className="mt-16 pt-8" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Link href="/directory" className="btn-pill inline-block">Shop the directory</Link>
      </div>
    </main>
  );
}
