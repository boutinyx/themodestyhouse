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
  const laneSubtypes = subtypesForLane(lane.slug);
  const answer = LANE_ANSWERS[lane.slug];
  // Landing via the nav flyout's ?type=blazer should read "Blazers" up top,
  // not the generic lane title — Tina: "i do wnat to see blazer etc etc
  // instead of outerwear in the title when i click on it". Now resolved once,
  // by lib/laneSubtypes, so the h1, the <title>, the canonical, the JSON-LD
  // and the sitemap cannot disagree about what this page is.
  const pageTitle = sub?.label ?? lane.title;
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-12 md:pt-16 pb-12">
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
      {/* NO SUB-CATEGORY CHIP ROW, 2026-08-26 — Tina, with a screenshot of it:
          "i said get rid of this shit". It was a wrapping <nav> of `.chip` links,
          one per subtype, with the current one filled aubergine.

          WHAT IT WAS FOR, because this has a cost and the cost should not be
          rediscovered by accident: it was the ONLY place on the site that emitted
          an href containing `type=`. The header's sub-category flyout is a
          client-side, portalled Base UI menu, so a crawler cannot follow it —
          before this row was added on 2026-08-19, the 10 `?type=` pages were in
          sitemap.xml and linked from nowhere. They are back in that state now:
          built, rendering, differentiated, and reachable only by a crawler that
          reads the sitemap. Raised with Tina at the moment of removal.

          Nothing else changed. `resolveSubtype` still runs, so a `?type=` URL
          still resolves — the h1, <title>, canonical, JSON-LD and the grid's
          `initialType` are all untouched, and the flyout still works for a human.
          Only the visible row of links is gone. `sitemapSubtypesForLane` in
          app/sitemap.ts is likewise untouched, so the URLs stay in the sitemap. */}
      {/* NO SEARCH FIELD, 2026-08-26 — Tina, with a screenshot of it: "the search
          bar for every catagory done just keep the filters". The Brand and Sort
          dropdowns stay; only the "Search houses, pieces…" input is gone.
          /directory keeps its own search — it is the site's index, and that is the
          page the header's Search link goes to. A lane is already a narrowed view,
          which is the same argument `searchable={false}` was added for on
          /edits/[slug]. */}
      <FilterableGrid catalogue={catalogue} initialType={type} searchable={false} />
      {answer && (
        // Informational copy AFTER the grid, not before it — a shopper wants
        // the products first. Still real, crawlable content: server-rendered,
        // not client-injected. See lib/laneAnswers.ts for why this exists.
        <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h2 className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15 }}>
            {answer.h2}
          </h2>
          <p className="mt-4" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>{answer.body}</p>
          {/* SUBTYPE LINKS LIVE HERE NOW, 2026-08-26, folded into the row that
              already existed rather than given a row and a label of their own.
              This is NOT the chip row coming back — Tina removed that twice and
              it is staying removed. That was a wrapping <nav> of filled chips
              directly under the h1, above the grid; this is plain underlined
              prose links at the very bottom of the informational block, in the
              row that has always said "Also browse".

              WHY THEY HAD TO GO SOMEWHERE. The chip row was the only place on the
              site emitting an href containing `type=`, and the header flyout is a
              client-side portalled menu a crawler cannot follow. Measured
              2026-08-26 after the removal: **zero** `type=` hrefs anywhere, and
              Search Console had 9 of the 10 `?type=` URLs as "URL is unknown to
              Google" or "Discovered — currently not indexed", despite all 10
              sitting in sitemap.xml with ~1,200 words and a unique h1 each.
              Requesting them by hand is capped at ~10 URLs a day and Tina hit that
              cap; links are the mechanism that does not need her.

              Folded into "Also browse" deliberately, so no new label had to be
              invented for her site (§10.18). The subtypes come first because they
              are narrower than the two sibling lanes beside them, and the one you
              are already viewing is skipped — a link to the page you are on is
              not a destination. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="eyebrow" style={{ color: 'var(--muted)' }}>Also browse</span>
            {laneSubtypes
              .filter((st) => st.type !== sub?.type)
              .map((st) => (
                <Link key={st.type} href={`/${lane.slug}?type=${st.type}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 14 }}>
                  {st.label}
                </Link>
              ))}
            {/* On a subtype view, the parent lane is a real destination and is
                otherwise unreachable from this row. */}
            {sub && (
              <Link href={`/${lane.slug}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 14 }}>
                All {lane.title}
              </Link>
            )}
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
