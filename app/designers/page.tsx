import type { Metadata } from 'next';
import Link from 'next/link';
import { houses, type House } from '@/lib/houses';

export const metadata: Metadata = {
  title: 'Designers | The Modesty House',
  description: 'A curated index of modest brands, vetted for craft and taste.',
};

const BADGE: Record<string, string> = {
  verified: '✦ Verified',
  'editors-pick': "✦ Editor's Pick",
};

/** The founder's pick, in the order Tina gave them. Chosen by hand, so it is a
 *  list of slugs rather than anything derived — a badge or a catalogue count
 *  would only approximate it and would drift the moment either changed. */
const FOUNDERS_PICK = ['veiled', 'aab', 'summer-evenings', 'inayah', 'glow-modesty'];

const PER_ROW = 5;
const ROWS_PER_PAGE = 6;
const PER_PAGE = PER_ROW * ROWS_PER_PAGE;

function Tile({ b, eager, seal }: { b: House; eager: boolean; seal: boolean }) {
  return (
    <a
      href={b.homepage}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block"
    >
      {/* The arch. A 3:4 portrait, because fashion is shot vertically and a
          square crop cuts most of these garments off at the waist.

          aspectRatio reserves the box before the image loads, so the grid does
          not shift as the photographs arrive — the site has no next/image and
          CLS on grids is a known landmine. */}
      <span
        className="relative block overflow-hidden"
        style={{
          aspectRatio: '3 / 4',
          borderRadius: '999px 999px 4px 4px',
          background: 'var(--bone)',
          border: '1px solid var(--hairline)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={b.image}
          alt={b.name}
          loading={eager ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          /* Pulled down from the top: the arch eats the upper corners, and on a
             model shot that is where the head and neckline sit. */
          style={{ objectPosition: 'center 22%' }}
        />
      </span>

      {/* Nothing is set on the photograph. No scrim, so the image is never
          dimmed to make room for type, and the name never has to fight a busy
          picture — which matters when 58 shops means 58 different backgrounds. */}
      <span className="block text-center mt-3">
        <span
          className="serif block"
          style={{ fontSize: 17, lineHeight: 1.15, color: 'var(--ink)' }}
        >
          {b.name}
        </span>
        <span className="eyebrow block mt-1.5">{b.city}</span>
        {/* The seal shows in the vetted row only. Everywhere else the chip is a
            repetition of what that row already says, and it is the only thing
            breaking the even rhythm of the grid. */}
        {seal && b.badge && <span className="badge mt-2">{BADGE[b.badge]}</span>}
      </span>
    </a>
  );
}

const grid = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-9';

export default async function DesignersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const all = houses();
  const bySlug = new Map(all.map((h) => [h.slug, h]));
  const picked = FOUNDERS_PICK.map((s) => bySlug.get(s)).filter((h): h is House => Boolean(h));

  // Vetted houses lead the index — there are exactly five, so they fill the
  // first row on their own — then everyone else in catalogue order.
  //
  // The founder's pick is held out of that tail, or four of the five would
  // appear twice on page one: Inayah and Glow Modesty sit inside the first
  // twenty-five by catalogue order. Veiled and Aab still repeat, because they
  // are genuinely in both selections — she picked two vetted houses.
  const vetted = all.filter((h) => h.badge);
  const index = [
    ...vetted,
    ...all.filter((h) => !h.badge && !FOUNDERS_PICK.includes(h.slug)),
  ];

  const pages = Math.max(1, Math.ceil(index.length / PER_PAGE));
  const raw = Number((await searchParams).page ?? '1');
  const page = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), pages) : 1;
  const shown = index.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-8 pt-40 pb-24">
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Designers</h1>
      <p className="mt-3 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        A curated index of modest fashion, brand by brand — vetted for craft and taste.
      </p>

      {page === 1 && (
        <>
          <h2 className="eyebrow mt-14 mb-6">Founder&rsquo;s pick</h2>
          <div className={grid}>
            {picked.map((b) => (
              <Tile key={b.slug} b={b} eager seal={false} />
            ))}
          </div>
        </>
      )}

      <h2 className="eyebrow mt-20 mb-6">
        The index · {index.length}
        {pages > 1 && <> · page {page} of {pages}</>}
      </h2>
      <div className={grid}>
        {shown.map((b, i) => (
          <Tile
            key={b.slug}
            b={b}
            eager={i < PER_ROW}
            // Only the first row of page one is the vetted row.
            seal={page === 1 && i < PER_ROW}
          />
        ))}
      </div>

      {pages > 1 && (
        // Real links, not state: every page is its own URL, so a crawler can
        // reach the houses below the fold. Almost none of the catalogue is
        // reachable today because grids reveal more client-side (§8).
        <nav className="flex items-center justify-center gap-8 mt-16" aria-label="Index pages">
          {page > 1 ? (
            <Link className="nav-link" href={page === 2 ? '/designers' : `/designers?page=${page - 1}`}>
              ← Previous
            </Link>
          ) : (
            <span className="nav-link" style={{ opacity: 0.35 }}>← Previous</span>
          )}
          <span className="eyebrow">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link className="nav-link" href={`/designers?page=${page + 1}`}>
              Next →
            </Link>
          ) : (
            <span className="nav-link" style={{ opacity: 0.35 }}>Next →</span>
          )}
        </nav>
      )}
    </main>
  );
}
