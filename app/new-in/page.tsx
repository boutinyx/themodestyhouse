import type { Metadata } from 'next';
import { browseProducts } from '@/lib/products';
import { newInProducts } from '@/lib/newIn';
import { DirectoryBrowser } from '@/components/DirectoryBrowser';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { BRANDS } from '@/data/brands';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, collectionPageSchema, jsonLdGraph } from '@/lib/schema';
import { pageMetadata } from '@/lib/seoCopy';
import { NEW_IN_ANSWER } from '@/lib/laneAnswers';
import { LANES } from '@/lib/lanes';
import Link from 'next/link';

/*
 * /new-in — replaced /directory ("All Clothing") on 2026-09-01 at Tina's
 * request. The selection rule lives in lib/newIn.ts and is unit-tested there;
 * this file is only the shell around it.
 *
 * Two search-param views, neither of them a distinct page:
 *   ?q=        searches EVERY house and the whole catalogue, NOT the New In
 *              selection. That is what keeps the header magnifier,
 *              useZeroResultSearch and the WebSite SearchAction behaving
 *              exactly as they did when this route was /directory — someone
 *              searching "Inayah" must still find Inayah, even though Inayah
 *              is not one of the 38 houses this page features.
 *   ?hijabs=1  widens the selection to include Hijabs & Scarves. A URL switch
 *              rather than client state because lib/compactCatalogue.ts
 *              encodes a garment DICTIONARY and a jilbab carries garment
 *              'abaya' — so the client cannot tell one from an abaya without a
 *              new column in a payload format whose whole purpose is being
 *              small. ?type= on the lane pages already works this way.
 */

// The visible on-page copy. SEO_COPY (title/meta description) is deliberately
// more keyword-dense and lives separately.
const DESCRIPTION = 'The latest pieces added, from a selected group of houses.';

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ q?: string; hijabs?: string }> },
): Promise<Metadata> {
  const { q, hijabs } = await searchParams;
  return {
    ...pageMetadata('/new-in'),
    // Both params are a view of this page, not a page of their own. They
    // canonicalise to /new-in (pageMetadata's default) and neither is offered
    // for indexing — the same treatment /directory?q= carried.
    ...(q || hijabs ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function NewInPage(
  { searchParams }: { searchParams: Promise<{ q?: string; hijabs?: string }> },
) {
  const { q, hijabs: hijabsParam } = await searchParams;
  const hijabs = hijabsParam === '1';
  // ONE call — both accessors re-parse ~11 MB uncached (CLAUDE.md §8).
  const rows = q ? browseProducts() : newInProducts({ hijabs });
  // Only the first two screenfuls of CARD data travel in the RSC payload; the
  // index columns still describe every row, so filtering and sorting stay
  // instant and entirely client-side.
  const catalogue = encodeCatalogue(rows, BRANDS, { embedCards: 48 });
  // See the note in app/[lane]/page.tsx on why filter(Boolean) rather than `!`.
  const listedItems = catalogue.rows.title.slice(0, 24)
    .map((_, i) => decodeCard(catalogue, i))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => ({ title: c.title, url: c.url, image: c.image }));

  // SHELL: max-w-[1220px] + px-8 + pt-12 md:pt-16 — the same three values as
  // every other page and the footer, so the content edges line up.
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-12 md:pt-16 pb-16">
      {!q && !hijabs && (
        <JsonLd
          data={jsonLdGraph(
            breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'New In', path: '/new-in' }]),
            collectionPageSchema({ name: 'New In', description: DESCRIPTION, path: '/new-in', items: listedItems }),
          )}
        />
      )}
      <h1 className="section-heading text-3xl md:text-4xl">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : 'New In'}
      </h1>
      <p className="mt-3 mb-6 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        {q ? 'Searching every house in the index.' : DESCRIPTION}
      </p>
      {/* Two server-rendered links, not a client toggle — see the header note.
          `.chip` and `.chip[data-active="true"]` already exist in globals.css;
          nothing new is added there. */}
      {!q && (
        <div className="mb-8 flex items-center gap-2">
          <Link href="/new-in" className="chip" data-active={!hijabs}>Clothing</Link>
          <Link href="/new-in?hijabs=1" className="chip" data-active={hijabs}>Include hijabs</Link>
        </div>
      )}
      <DirectoryBrowser catalogue={catalogue} initialQuery={q ?? ''} />
      {/* Informational block AFTER the grid, mirroring every lane page.
          Server-rendered, so it is real crawlable text. */}
      <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
        <h2 className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15 }}>
          {NEW_IN_ANSWER.h2}
        </h2>
        <p className="mt-4" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>{NEW_IN_ANSWER.body}</p>
        <div className="mt-6 flex items-center gap-4">
          <span className="eyebrow" style={{ color: 'var(--muted)' }}>Also browse</span>
          {NEW_IN_ANSWER.related.map((slug) => {
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
