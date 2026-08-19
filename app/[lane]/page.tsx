import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LANES } from '@/lib/lanes';
import { productsForLane } from '@/lib/products';
import { FilterableGrid } from '@/components/FilterableGrid';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { BRANDS } from '@/data/brands';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, collectionPageSchema, jsonLdGraph } from '@/lib/schema';
import { SEO_COPY, buildMetadata } from '@/lib/seoCopy';
import { LANE_ANSWERS } from '@/lib/laneAnswers';
import { LANE_SUBTYPES, resolveSubtype, subtypesForLane, subtypeSeo } from '@/lib/laneSubtypes';

export function generateStaticParams() {
  return LANES.map((l) => ({ lane: l.slug }));
}

// Keeps these pages statically prerendered (fast, cheap on Railway) while
// still picking up a live /staff/curate cut within a minute — a full
// force-dynamic switch would work too but gives up prerendering sitewide for
// something that only needs to be near-real-time. See
// docs/log/2026-08-12-staff-curate.md for why "immediately" means this and
// not a full rebuild.
export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lane: string }>;
  searchParams: Promise<{ type?: string }>;
}): Promise<Metadata> {
  const { lane: slug } = await params;
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return {};

  // ?type= is a real page, not a view of this one. Until 2026-08-19 this
  // function ignored searchParams entirely, so all 14 subtype URLs canonicalised
  // to their bare parent lane and carried the parent's <title> — i.e. they told
  // Google "I am a duplicate of /outerwear", about a grid whose contents differ.
  // resolveSubtype validates against lib/specialty.ts rather than the encoded
  // catalogue, because building the catalogue here would re-parse 10.9 MB
  // uncached on every metadata call (CLAUDE.md §8).
  const sub = resolveSubtype(lane.slug, (await searchParams).type);
  if (sub) {
    const seo = subtypeSeo(sub, lane.intro);
    return buildMetadata({ ...seo, canonical: `/${lane.slug}?type=${sub.type}` });
  }

  const seo = SEO_COPY[`/${lane.slug}`];
  return buildMetadata({
    title: seo?.title ?? lane.title,
    description: seo?.description ?? lane.intro,
    canonical: `/${lane.slug}`,
  });
}

export default async function LanePage({
  params,
  searchParams,
}: {
  params: Promise<{ lane: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { lane: slug } = await params;
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) notFound();
  const { type } = await searchParams;
  const catalogue = encodeCatalogue(productsForLane(lane.slug), BRANDS);
  const sub = resolveSubtype(lane.slug, type);
  const laneSubtypes = subtypesForLane(lane.slug);

  // The rows this page actually shows. Previously listedItems was always the
  // FIRST 24 rows of the unfiltered lane, so /outerwear?type=blazer emitted a
  // CollectionPage named "Outerwear" whose ItemList opened with "Maren Vest" —
  // structured data that contradicted both the h1 and the grid. Mirrors
  // FilterableGrid's own predicate, including the `?? -1` for a column that
  // encodeCatalogue omitted as all-sentinel.
  const matchIdx = (i: number): boolean => {
    if (!sub) return true;
    const domain = LANE_SUBTYPES[lane.slug]?.domain;
    const col =
      domain === 'outerwear'
        ? catalogue.rows.outerwearSubtypeIdx
        : domain === 'hijab'
          ? catalogue.rows.hijabSubtypeIdx
          : catalogue.rows.layeringSubtypeIdx;
    const dict =
      domain === 'outerwear'
        ? (catalogue.outerwearSubtypes as readonly string[])
        : domain === 'hijab'
          ? (catalogue.hijabSubtypes as readonly string[])
          : (catalogue.layeringSubtypes as readonly string[]);
    const want = dict.indexOf(sub.type);
    if (want === -1) return false;
    return (col?.[i] ?? -1) === want;
  };
  const listedRows: number[] = [];
  for (let i = 0; i < catalogue.rows.title.length && listedRows.length < 24; i++) {
    if (matchIdx(i)) listedRows.push(i);
  }
  const listedItems = listedRows.map((i) => {
    const c = decodeCard(catalogue, i);
    return { title: c.title, url: c.url, image: c.image };
  });
  const answer = LANE_ANSWERS[lane.slug];
  // Landing via the nav flyout's ?type=blazer should read "Blazers" up top,
  // not the generic lane title — Tina: "i do wnat to see blazer etc etc
  // instead of outerwear in the title when i click on it". Now resolved once,
  // by lib/laneSubtypes, so the h1, the <title>, the canonical, the JSON-LD
  // and the sitemap cannot disagree about what this page is.
  const pageTitle = sub?.label ?? lane.title;
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-12">
      {/* Breadcrumb gains a third crumb on a subtype page, and the
          CollectionPage now describes the FILTERED page rather than its
          parent — see the listedRows note above for what it used to claim. */}
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema(
            sub
              ? [
                  { name: 'Home', path: '/' },
                  { name: lane.title, path: `/${lane.slug}` },
                  { name: sub.label, path: `/${lane.slug}?type=${sub.type}` },
                ]
              : [{ name: 'Home', path: '/' }, { name: lane.title, path: `/${lane.slug}` }],
          ),
          collectionPageSchema({
            name: pageTitle,
            description: sub ? subtypeSeo(sub, lane.intro).description : lane.intro,
            path: sub ? `/${lane.slug}?type=${sub.type}` : `/${lane.slug}`,
            items: listedItems,
          }),
        )}
      />
      <h1 className="section-heading text-3xl md:text-4xl">{pageTitle}</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>{lane.intro}</p>
      {/* Server-rendered <a>s, so the subtype pages are reachable by a crawler
          at all. The nav flyout that used to be their only entry point is a
          client-side portalled Base UI menu, so before 2026-08-19 NO page on
          the site emitted a single href containing `type=` — 14 built,
          rendering, differentiated pages that nothing could find. Plain links,
          not the filter control: FilterableGrid still owns the interactive
          filtering, this just makes the URLs discoverable. */}
      {laneSubtypes.length > 0 && (
        <nav className="flex flex-wrap gap-2 mb-8" aria-label={`${lane.title} sub-categories`}>
          {laneSubtypes.map((st) => {
            const active = sub?.type === st.type;
            return (
              <Link
                key={st.type}
                href={active ? `/${lane.slug}` : `/${lane.slug}?type=${st.type}`}
                aria-current={active ? 'page' : undefined}
                className="chip"
                style={
                  active
                    ? { background: 'var(--aubergine)', color: 'var(--parchment)', borderColor: 'var(--aubergine)' }
                    : undefined
                }
              >
                {st.label}
              </Link>
            );
          })}
        </nav>
      )}
      <FilterableGrid catalogue={catalogue} initialType={type} />
      {answer && (
        // Informational copy AFTER the grid, not before it — a shopper wants
        // the products first. Still real, crawlable content: server-rendered,
        // not client-injected. See lib/laneAnswers.ts for why this exists.
        <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h2 className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15 }}>
            {answer.h2}
          </h2>
          <p className="mt-4" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>{answer.body}</p>
          <div className="mt-6 flex items-center gap-4">
            <span className="eyebrow" style={{ color: 'var(--muted)' }}>Also browse</span>
            {answer.related.map((slug) => {
              const l = LANES.find((x) => x.slug === slug);
              return l ? (
                <Link key={slug} href={`/${slug}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 14 }}>
                  {l.title}
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}
    </main>
  );
}
