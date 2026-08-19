import type { Metadata } from 'next';
import { browseProducts } from '@/lib/products';
import { DirectoryBrowser } from '@/components/DirectoryBrowser';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { BRANDS } from '@/data/brands';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, collectionPageSchema, jsonLdGraph } from '@/lib/schema';
import { pageMetadata } from '@/lib/seoCopy';
import { DIRECTORY_ANSWER } from '@/lib/laneAnswers';
import { LANES } from '@/lib/lanes';
import Link from 'next/link';

// The visible on-page copy — unchanged, still hers. SEO_COPY (title/meta
// description) is deliberately more keyword-dense and lives separately.
const DESCRIPTION = 'Browse modest pieces from every verified house.';

// `?q=` is a search-result view of the same page, not a distinct one — Google
// indexes the base URL and a search box already exists per-brand on the
// brand's own site, so this is not a doorway page, just a filter of one.
// noindex it and canonicalise to the unfiltered directory (CLAUDE.md's
// sitemap.ts comment flagged this as "a canonical-tag problem" with no fix
// yet — this is that fix).
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    ...pageMetadata('/directory'),
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const catalogue = encodeCatalogue(browseProducts(), BRANDS);
  const listedItems = catalogue.rows.title.slice(0, 24).map((_, i) => {
    const c = decodeCard(catalogue, i);
    return { title: c.title, url: c.url, image: c.image };
  });
  // Same header shape as app/[lane]/page.tsx — left-aligned h1 with a short line
  // under it — so the directory reads as one of the category pages rather than a
  // different template. The intro is this page's own metadata description,
  // reused rather than newly written.
  //
  // SHELL: max-w-[1220px] + px-8 + pt-32 md:pt-40. Those three values are now
  // the same on every page and on the footer. They were max-w-6xl + px-5, which
  // put this page's content edge 22px inside the footer's at 1440 and 12px
  // inside it on a phone — two boxes stacked directly on top of one another and
  // not lining up. The top padding clears the fixed header, whose bottom edge is
  // at 88px at every width.
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-16">
      {!q && (
        <JsonLd
          data={jsonLdGraph(
            breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Products', path: '/directory' }]),
            collectionPageSchema({ name: 'Products', description: DESCRIPTION, path: '/directory', items: listedItems }),
          )}
        />
      )}
      {/* Was the bare word "Products" — zero-keyword, and mismatched against
          this page's own <title> ("Shop Modest Clothing Online"). Matches the
          Title Case noun-phrase pattern every lane h1 already uses
          (lib/lanes.ts — "Modest Dresses", "Abayas", etc). */}
      <h1 className="section-heading text-3xl md:text-4xl">
        {q ? <>Results for “{q}”</> : 'Modest Clothing'}
      </h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        {DESCRIPTION}
      </p>
      <DirectoryBrowser catalogue={catalogue} initialQuery={q ?? ''} />
      {/* Informational block AFTER the grid, mirroring every lane page
          (app/[lane]/page.tsx). /directory had exactly one sentence of its own
          prose and no <h2> at all, on the site's highest-intent URL. Server
          -rendered, so it is real crawlable text, not client-injected. */}
      <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
        <h2 className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15 }}>
          {DIRECTORY_ANSWER.h2}
        </h2>
        <p className="mt-4" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>{DIRECTORY_ANSWER.body}</p>
        <div className="mt-6 flex items-center gap-4">
          <span className="eyebrow" style={{ color: 'var(--muted)' }}>Also browse</span>
          {DIRECTORY_ANSWER.related.map((slug) => {
            const l = LANES.find((x) => x.slug === slug);
            return l ? (
              <Link key={slug} href={`/${slug}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 14 }}>
                {l.title}
              </Link>
            ) : null;
          })}
        </div>
      </section>
    </main>
  );
}
