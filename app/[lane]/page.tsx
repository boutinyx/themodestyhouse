import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LANES } from '@/lib/lanes';
import { productsForLane } from '@/lib/products';
import { FilterableGrid } from '@/components/FilterableGrid';
import { encodeCatalogue } from '@/lib/compactCatalogue';
import { BRANDS } from '@/data/brands';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, collectionPageSchema, faqPageSchema, jsonLdGraph } from '@/lib/schema';
import { SEO_COPY, buildMetadata } from '@/lib/seoCopy';
import { LANE_ANSWERS } from '@/lib/laneAnswers';
import { LANE_SUBTYPES, resolveSubtype, subtypeSeo, domainForLane, subtypeValueOf } from '@/lib/laneSubtypes';

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
  // embedCards + source belong together: the grid can only fetch the rows this
  // omits if it knows what they are indices INTO. See FilterableGrid's `source`
  // prop. → docs/superpowers/plans/2026-08-26-split-catalogue-payload.md
  // ONE call. productsForLane -> getProducts() is uncached and re-reads and
  // re-parses the whole 10.9 MB products.json every time (CLAUDE.md §8), so
  // the encoder and the ItemList below share this array rather than each
  // asking for their own copy.
  const laneProducts = productsForLane(lane.slug);
  const catalogue = encodeCatalogue(laneProducts, BRANDS, { embedCards: 48 });
  const sub = resolveSubtype(lane.slug, type);

  // The rows this page actually shows, taken from the PRODUCT ARRAY rather
  // than from the encoded catalogue.
  //
  // It used to scan `catalogue.rows` for matching indices and decodeCard each
  // one — and decodeCard returns null outside the `embedCards: 48` window, so
  // every match past row 48 was found and then dropped. That is why
  // /modest-hijabs?type=undercap shipped a CollectionPage whose ItemList was
  // EMPTY, on production, measured 2026-09-02 before this was touched. The
  // `filter(Boolean)` below it was written to be defensive and was in fact
  // load-bearing, which is the tell that nobody had looked at the output.
  //
  // `productsForLane` is already in hand (it is what the catalogue is encoded
  // FROM, in this order), so filtering it directly is both cheaper and exact:
  // these are the same rows, in the same order, that FilterableGrid paints.
  const domain = domainForLane(lane.slug);
  const listedItems = (sub && domain
    ? laneProducts.filter((p) => subtypeValueOf(domain, p) === sub.type)
    : laneProducts
  )
    .slice(0, 24)
    .map((p) => ({ title: p.title, url: p.url, image: p.image }));
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
          // The answer block below the grid, in machine-readable form. Added
          // 2026-09-02: the prose has existed since 2026-08-11 and was the
          // ONLY substantial writing on these pages, emitted as an <h2> and a
          // <p> and nothing else.
          //
          // NOT FOR A GOOGLE RICH RESULT — Google restricted FAQ rich results
          // to government and health sites in August 2023, so this will not
          // draw an accordion in the SERP and it would be dishonest to imply
          // it might. It is here because the AI answer engines parse it, and
          // on this site those are not a side channel: Pulse, 30 days to
          // 2026-09-01, records ~102 visitors from ChatGPT against ~51 from
          // google.com. → docs/log/2026-09-02-pulse-and-gsc-seo-review.md
          //
          // The question and the answer are the SAME strings the page paints,
          // read from the same object — schema that described text a visitor
          // cannot see is exactly what the guidelines prohibit, and the way
          // that happens is two sources drifting, not anyone intending it.
          ...(answer ? [faqPageSchema([{ question: answer.h2, answer: answer.body }])] : []),
        )}
      />
      <h1 className="section-heading text-3xl md:text-4xl">{pageTitle}</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>{lane.intro}</p>
      {/* NO SUB-CATEGORY CHIP ROW, 2026-08-26 — Tina, with a screenshot of it:
          "i said get rid of this shit". It was a wrapping <nav> of `.chip` links,
          one per subtype, with the current one filled aubergine.

          WHAT IT WAS FOR — and the first version of this note got it WRONG, so
          read the correction: it said this row was "the ONLY place on the site
          emitting an href containing `type=`", and that removing it left those
          pages linked from nowhere. **False.** `components/MobileNav.tsx` renders
          every subtype as a real server-rendered `<a href="/lane?type=x">`, on
          EVERY page of the site — measured on production with the chip row gone:
          10 distinct `type=` hrefs on `/`, `/directory`, `/modest-hijabs`,
          `/modest-dresses` and `/layering-basics` alike. The claim came from a
          scratch crawler that stripped query strings before counting, so it could
          never have found one. The desktop flyout (`Nav.tsx`) is indeed a
          client-side portalled menu a crawler cannot follow; the phone nav is not,
          and it is in the HTML for everyone.

          So the honest position: removing this row cost some contextual,
          above-the-fold relevance, not discoverability. The `?type=` pages are
          linked and still mostly unindexed, which means link starvation was never
          the reason and adding links back would not have fixed it.

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
      <FilterableGrid catalogue={catalogue} initialType={type} searchable={false} source={{ lane: lane.slug }} laneDomain={domainForLane(lane.slug)} />
      {answer && (
        // Informational copy AFTER the grid, not before it — a shopper wants
        // the products first. Still real, crawlable content: server-rendered,
        // not client-injected. See lib/laneAnswers.ts for why this exists.
        <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h2 className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15 }}>
            {answer.h2}
          </h2>
          <p className="mt-4" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>{answer.body}</p>
          {/* SUBTYPE LINKS JOINED THIS ROW 2026-09-02, and it matters WHERE
              they are. The 16 `?type=` pages shipped that morning went into
              the sitemap with ZERO internal links — measured on production:
              every page of the site emits 10 `type=` hrefs and not one of
              them pointed at a new lane. §8 states the consequence plainly:
              a sitemap entry gets a page crawled, internal links are what
              pass ranking signal.

              This is NOT the sub-category chip row Tina removed on
              2026-08-26 ("i said get rid of this shit"). That was a <nav> of
              filled `.chip` filter controls ABOVE the grid, duplicating the
              Type dropdown. This is the existing "Also browse" text row
              BELOW the grid — the module that already exists for internal
              linking — carrying more links and no new words: every label
              here is either a lane title or a subtype label already shipped.

              On a subtype page the parent lane is included, so each of the
              16 links to its siblings AND back up, rather than being a leaf
              the crawler reaches once and never leaves. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="eyebrow" style={{ color: 'var(--muted)' }}>Also browse</span>
            {sub && (
              <Link href={`/${lane.slug}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 14 }}>
                {lane.title}
              </Link>
            )}
            {LANE_SUBTYPES[lane.slug]?.subtypes
              .filter((t) => t.type !== sub?.type)
              .map((t) => (
                <Link key={t.type} href={`/${lane.slug}?type=${t.type}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 14 }}>
                  {t.label}
                </Link>
              ))}
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
