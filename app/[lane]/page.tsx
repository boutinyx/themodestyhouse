import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LANES } from '@/lib/lanes';
import { productsForLane } from '@/lib/products';
import { FilterableGrid } from '@/components/FilterableGrid';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS, HIJAB_SUBTYPE_LABELS } from '@/lib/specialty';
import { BRANDS } from '@/data/brands';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, collectionPageSchema, jsonLdGraph } from '@/lib/schema';
import { SEO_COPY, buildMetadata } from '@/lib/seoCopy';
import { LANE_ANSWERS } from '@/lib/laneAnswers';

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

export async function generateMetadata({ params }: { params: Promise<{ lane: string }> }): Promise<Metadata> {
  const { lane: slug } = await params;
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return {};
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
  const listedItems = catalogue.rows.title.slice(0, 24).map((_, i) => {
    const c = decodeCard(catalogue, i);
    return { title: c.title, url: c.url, image: c.image, brandName: c.brandName };
  });
  const answer = LANE_ANSWERS[lane.slug];
  // Landing via the nav flyout's ?type=blazer should read "Blazers" up top,
  // not the generic lane title — Tina: "i do wnat to see blazer etc etc
  // instead of outerwear in the title when i click on it". Validated against
  // this catalogue's real subtype columns, same as FilterableGrid's own
  // `initialType` check — an arbitrary query string is user input, and an
  // invalid one should fall back to the lane title, not print raw garbage.
  const subtypeTitle =
    type && (catalogue.layeringSubtypes as string[]).includes(type)
      ? LAYERING_SUBTYPE_LABELS[type as (typeof catalogue.layeringSubtypes)[number]]
      : type && (catalogue.outerwearSubtypes as string[]).includes(type)
        ? OUTERWEAR_SUBTYPE_LABELS[type as (typeof catalogue.outerwearSubtypes)[number]]
        : type && (catalogue.hijabSubtypes as string[]).includes(type)
          ? HIJAB_SUBTYPE_LABELS[type as (typeof catalogue.hijabSubtypes)[number]]
          : null;
  const pageTitle = subtypeTitle ?? lane.title;
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-12">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([{ name: 'Home', path: '/' }, { name: lane.title, path: `/${lane.slug}` }]),
          collectionPageSchema({ name: lane.title, description: lane.intro, path: `/${lane.slug}`, items: listedItems }),
        )}
      />
      <h1 className="section-heading text-3xl md:text-4xl">{pageTitle}</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>{lane.intro}</p>
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
