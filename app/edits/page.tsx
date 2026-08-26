import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { EDITS } from '@/lib/edits';
import { pageMetadata } from '@/lib/seoCopy';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, jsonLdGraph } from '@/lib/schema';

/**
 * /edits — the index the three edit pages never had.
 *
 * `/edits/[slug]` was added 2026-08-24 without a parent route, so `/edits`
 * returned 404 while its children were live, in `sitemap.xml` and linked from
 * the homepage and the footer. Tina, 2026-08-26: *"i do want you to fix this
 * /edits has no index page — it 404s."*
 *
 * Deliberately built as a near-copy of `/editorial`'s index rather than as a new
 * layout: the two pages are the same object — a reverse-chronological list of
 * long-form things with a hero photograph — and the site already has one answer
 * for that shape. The differences are only the ones the DATA forces:
 *
 *   - An edit's hero is a real measured ratio (`imageRatio`), not the editorial
 *     index's fixed 16/10 box. Cropping is what `lib/edits.ts` spends four
 *     paragraphs preventing, so the tile uses each edit's own shape.
 *   - `imageWidths` drives the srcset, because `optimise-images.mjs` never
 *     upscales and asking for a width the source cannot supply yields a 404 in
 *     the srcset rather than a smaller file.
 *   - No date line. An edit has an `eyebrow` ("The Edit · Autumn 2026") that
 *     already carries its season, and no date field to format.
 *
 * ORDER is `EDITS` as authored, with the featured one first — the same rule the
 * homepage banner uses (`featured`, not `EDITS[0]`, for the reason stated on
 * that field: an array position is not a decision).
 */
export const metadata: Metadata = pageMetadata('/edits');

export default function EditsIndexPage() {
  const edits = [...EDITS].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));

  return (
    <main className="max-w-[900px] mx-auto px-8 pt-12 md:pt-16 pb-24">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'The Edits', path: '/edits' },
          ]),
        )}
      />
      <div className="text-center mb-14">
        <h1 className="serif mt-3" style={{ fontSize: 'clamp(36px,5.5vw,60px)', lineHeight: 1.02, color: 'var(--ink)' }}>The Edits</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
          Hand-picked selections from across the directory.
        </p>
      </div>

      <div>
        {edits.map((e) => (
          <Link
            key={e.slug}
            href={`/edits/${e.slug}`}
            /* `block` in the base, not only inside the md: grid — a <Link> is an
               <a> and therefore inline by default, so below md the vertical
               padding and border-top below would do nothing at all. That exact
               bug is documented on /editorial's own index; this inherits the
               fix rather than the bug. */
            className="group block items-center md:grid md:grid-cols-[320px_1fr] md:gap-7"
            style={{ borderTop: '1px solid var(--hairline)', padding: '28px 0' }}
          >
            <div
              className="overflow-hidden rounded-xl mb-4 md:mb-0"
              /* The edit's OWN ratio, not a fixed box — see the note above. */
              style={{ aspectRatio: String(e.imageRatio), background: 'var(--bone)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.image}
                /* Exactly the expression /edits/[slug] and EditBanner already use —
                   copied rather than re-derived, so all three surfaces build the
                   same filenames and a change to the naming scheme breaks them
                   together instead of one silently 404ing in a srcset. */
                srcSet={e.imageWidths.map((w) => `${e.image.replace(/\.jpg$/, `-${w}.webp`)} ${w}w`).join(', ')}
                sizes="(max-width: 768px) 100vw, 320px"
                alt={e.imageAlt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div>
              <div className="eyebrow">{e.eyebrow}</div>
              <h2 className="serif mt-2" style={{ fontSize: 'clamp(24px,3.2vw,36px)', lineHeight: 1.08, color: 'var(--ink)' }}>{e.title}</h2>
              {e.dek && <p className="mt-2" style={{ color: 'var(--muted)', fontSize: 16, maxWidth: '62ch' }}>{e.dek}</p>}
              {/* Phosphor, not the → character (CLAUDE.md §6). */}
              <div className="nav-link mt-3 inline-flex items-center gap-1.5">See the edit <ArrowRight size={12} weight="bold" /></div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
