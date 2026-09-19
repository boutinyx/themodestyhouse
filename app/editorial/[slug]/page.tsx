import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { seo, getPost, getPosts, formatDate } from '@/lib/posts';
import GhostHtml from '@/components/GhostHtml';
import { fetchAllPosts } from '@/lib/ghost';
import { ghostImageVariant, ghostImageSrcSet } from '@/lib/ghostImage';
import { JsonLd } from '@/components/JsonLd';
import { articleSchema, breadcrumbSchema, jsonLdGraph } from '@/lib/schema';
import { pageTitle } from '@/lib/metaTitle';

// The floor equals the Cloudflare edge TTL, so a lost webhook degrades to one hour and
// never to "until the next deploy". `dynamicParams` stays at its default (true), so a post
// published after the last build renders on first request.
export const revalidate = 3600;

export async function generateStaticParams() {
  // Throws (never returns []) when Ghost is down: an empty blog must not ship silently.
  // fetchAllPosts() has already reconciled the row count against Ghost's own total.
  const rows = await fetchAllPosts();
  if (rows.length < 1) throw new Error('Ghost has no published posts; refusing to build an empty /editorial');
  const noDek = rows.filter((r) => !r.custom_excerpt).map((r) => r.slug);
  if (noDek.length) console.warn(`[ghost] posts with no custom_excerpt (dek falls back to Ghost's auto excerpt): ${noDek.join(', ')}`);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: 'Not found' };
  // <title> and meta description take the SEO override when the post has one;
  // OpenGraph and Twitter deliberately keep the headline, because a shared link
  // is read by a person rather than ranked. See lib/posts.ts::seo.
  const s = seo(p);
  return {
    // pageTitle(): three of the five over-long titles on the site are editorial
    // headlines, and the ' | The Modesty House' the layout appends is what puts
    // them over. openGraph/twitter below keep p.title untouched.
    title: pageTitle(s.title),
    description: s.description,
    alternates: { canonical: `/editorial/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.dek,
      type: 'article',
      publishedTime: p.date,
      authors: [p.author],
      ...(p.image ? { images: [{ url: p.image }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: p.title,
      description: p.dek,
      ...(p.image ? { images: [p.image] } : {}),
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();

  // getPosts() is already date-sorted (lib/posts.ts), so this is the three
  // most recent OTHER posts, and it needs no ordering decision of its own.
  const others = (await getPosts()).filter((o) => o.slug !== p.slug).slice(0, 3);

  return (
    <main className="max-w-[720px] mx-auto px-8 pt-12 md:pt-16 pb-24">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'The Edit', path: '/editorial' }, { name: p.title, path: `/editorial/${p.slug}` }]),
          articleSchema({ title: p.title, description: p.dek, path: `/editorial/${p.slug}`, datePublished: p.date, authorName: p.author, image: p.image }),
        )}
      />
      {/* Phosphor, not the ← character (CLAUDE.md §6). */}
      <Link href="/editorial" className="nav-link inline-flex items-center gap-1.5">
        <ArrowLeft size={12} weight="bold" /> The Edit
      </Link>

      {p.image && (
        <div className="mt-6 overflow-hidden rounded-2xl" style={{ background: 'var(--bone)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ghostImageVariant(p.image, 900) ?? p.image}
            srcSet={ghostImageSrcSet(p.image)}
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

      <article className="editorial-prose">
        <GhostHtml html={p.html} />
      </article>

      {/* The other posts, added 2026-09-15. Two measurements, one fix: a post
          reached only from /editorial has a single inbound internal link
          (counted across all 160 sitemap pages — `still-boiling-feeling-fall`
          had exactly one), and Inoma Digital's 2026-09-11 audit flags the same
          thing as "pages with only one internal link". No composed copy: the
          eyebrow reuses "The Edit", the site's own name for this section, and
          every other string on screen is the post's own title. */}
      {others.length > 0 && (
        <div className="mt-16 pt-8" style={{ borderTop: '1px solid var(--hairline)' }}>
          <div className="eyebrow" style={{ color: 'var(--muted)' }}>The Edit</div>
          <ul className="mt-4 space-y-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/editorial/${o.slug}`} className="serif" style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--ink)' }}>
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-16 pt-8" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Link href="/new-in" className="btn-pill inline-block">Shop the directory</Link>
      </div>
    </main>
  );
}
