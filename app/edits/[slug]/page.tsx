import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EDITS, editBySlug } from '@/lib/edits';
import { productsForEdit } from '@/lib/products';
import { BRANDS } from '@/data/brands';
import { FilterableGrid } from '@/components/FilterableGrid';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, collectionPageSchema, jsonLdGraph } from '@/lib/schema';

/**
 * /edits/[slug] — the campaign hero + grid page. See lib/edits.ts for what an
 * edit IS and why it isn't a lane or a blog post.
 *
 * Structure is Tina's, from the aab reference she sent: full-bleed photograph,
 * script title over it, small-caps line, then the pieces. "only items and maybe
 * somewhere an explanation how you can style it but mostly items" — so the
 * styling block is one section, after the grid.
 */
export function generateStaticParams() {
  return EDITS.map((e) => ({ slug: e.slug }));
}

// Matches every other grid page: prerendered, but picks up a /staff/curate cut
// within a minute.
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const edit = editBySlug(slug);
  if (!edit) return { title: 'Not found', robots: { index: false, follow: false } };
  const canonical = `/edits/${edit.slug}`;
  return {
    title: edit.seoTitle,
    description: edit.seoDescription,
    alternates: { canonical },
    openGraph: {
      title: edit.seoTitle,
      description: edit.seoDescription,
      type: 'website',
      url: canonical,
      images: [{ url: edit.image }],
    },
    twitter: { card: 'summary_large_image', title: edit.seoTitle, description: edit.seoDescription, images: [edit.image] },
  };
}

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edit = editBySlug(slug);
  if (!edit) notFound();

  const products = productsForEdit(edit);
  if (products.length === 0) notFound();

  const catalogue = encodeCatalogue(products, BRANDS);
  // Only the rows the grid actually renders go into the JSON-LD item list —
  // the same 24 FilterableGrid shows before "show more". Claiming 428 items in
  // schema for a page that paints 24 would be describing a different page.
  const listedItems = catalogue.rows.title.slice(0, 24).map((_, i) => {
    const c = decodeCard(catalogue, i);
    return { title: c.title, url: c.url, image: c.image, brandName: c.brandName };
  });

  const houses = new Set(products.map((p) => p.brandSlug)).size;

  return (
    <main className="pb-12">
      <JsonLd
        data={jsonLdGraph(
          // Two crumbs, not three. There is no /edits index page yet, and a
          // breadcrumb pointing at a 404 is worse than a shorter breadcrumb.
          // Add the middle crumb the day that page exists.
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: edit.title, path: `/edits/${edit.slug}` },
          ]),
          collectionPageSchema({
            name: edit.title,
            description: edit.seoDescription,
            path: `/edits/${edit.slug}`,
            items: listedItems,
          }),
        )}
      />

      {/* HERO. Pulled up behind the header the same way the homepage hero is —
          .hero-vh's sibling trick, but local: the header is sticky and reserves
          its own flow space, so a negative margin of exactly --header-height
          slides the photograph underneath it. Height is capped rather than
          100svh: this is a campaign banner, not a front door. */}
      <section
        // data-hero is what components/Header.tsx watches to go transparent and
        // drop its darkening wash — the same mechanism the homepage hero uses.
        // Without it the header stays solid parchment and simply covers the top
        // ~88px of the photograph, which is both a waste of the image and not
        // the reference layout Tina asked for. The header restores itself the
        // moment this element scrolls past.
        data-hero
        className="edit-hero relative overflow-hidden"
        style={{ marginTop: 'calc(-1 * var(--header-height))', background: 'var(--aubergine)' }}
      >
        {/* No srcset deliberately. lib/staticImage.ts's editorial variants are
            400w and 900w — sized for the cards and the post covers they were
            generated for, and both too small for a full-bleed hero, which would
            render visibly soft on any desktop. The original (1696x960, 98 KB) is
            served directly instead.
            WHEN A REAL HERO LANDS: put it in public/, run
            `node scripts/optimise-images.mjs` to generate variants, and wire a
            srcset here. Give it a NEW filename — public/ is cached for 4h and
            is not fingerprinted (§6, §10.21). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={edit.image}
          alt={edit.imageAlt}
          className="absolute inset-0 w-full h-full object-cover"
          // The hero is the LCP element on this page — eager, high priority, and
          // never lazy. Lazy-loading an above-the-fold hero is a measurable LCP
          // regression, not a saving.
          loading="eager"
          fetchPriority="high"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(12,6,12,0.46) 0%, rgba(12,6,12,0.28) 45%, rgba(12,6,12,0.52) 100%)' }}
        />
        {/* absolute inset-0, not a min-height: the section's own aspect-ratio
            (.edit-hero) is what sets the height now, so anything here that also
            declared a height would fight it. padding-top clears the sticky
            header the negative margin above just slid the photograph under. */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
          style={{ paddingTop: 'var(--header-height)' }}
        >
          <h1
            className="serif"
            style={{
              color: 'var(--parchment)',
              fontSize: 'clamp(38px, 7vw, 84px)',
              lineHeight: 1.02,
              textShadow: '0 2px 30px rgba(0,0,0,0.5)',
            }}
          >
            {edit.title}
          </h1>
          <p
            className="eyebrow mt-5"
            style={{ color: 'rgba(251,250,246,0.92)', letterSpacing: '0.22em', fontSize: 13 }}
          >
            {edit.eyebrow}
          </p>
          <p
            className="mt-4"
            style={{ color: 'rgba(251,250,246,0.9)', fontFamily: 'var(--font-ui)', fontSize: 16 }}
          >
            {edit.dek}
          </p>
        </div>
      </section>

      <div className="max-w-[1220px] mx-auto px-8 pt-12">
        {/* Measured, not asserted — same standard as the brand pages. */}
        <p className="eyebrow" style={{ color: 'var(--muted)' }}>
          {products.length.toLocaleString('en-GB')} pieces · {houses} houses
        </p>

        <div className="mt-6">
          <FilterableGrid catalogue={catalogue} />
        </div>

        {/* The styling block, AFTER the grid. Tina asked for "mostly items", and
            lib/laneAnswers.ts already established the ordering rule: pieces
            first, words after. Server-rendered so it is real, crawlable content
            rather than something only a reader with JS ever sees. */}
        <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h2 className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15 }}>
            {edit.styling.h2}
          </h2>
          {edit.styling.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mt-4" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>
              {p}
            </p>
          ))}
          <div className="mt-8">
            <Link
              href="/directory"
              className="nav-link inline-flex items-center gap-1.5"
              style={{ color: 'var(--aubergine)' }}
            >
              Browse the whole directory
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
