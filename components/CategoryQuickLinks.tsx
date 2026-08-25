import Link from 'next/link';
// ssr entrypoint — this renders inside app/page.tsx, a server component
// (CLAUDE.md §6), so it stays a server component too rather than forcing a
// 'use client' boundary onto the homepage for a row of plain links.
import { ArrowRight, Dress, CoatHanger, StackSimple, Waves } from '@phosphor-icons/react/dist/ssr';
import { LANES } from '@/lib/lanes';

/**
 * The icon strip directly under the homepage hero — Tina's reference
 * screenshot (aabcollection.com's own hero-adjacent row), 2026-08-21:
 * "i want this on the hero."
 *
 * REAL lanes, not invented ones. Slugs are looked up from lib/lanes.ts by
 * name (findLane throws if one goes missing) rather than hand-copied as bare
 * strings, so a future slug rename can't silently produce a dead link here
 * without breaking the build.
 *
 * FOUR tiles as of 2026-08-25, not the original five. Tina sent a crop of the
 * "OCCASION" tile: "this block needs to go". It was the odd one out from the
 * day it was built and this comment already said so — it was the only label
 * that did not match its lane's own `nav` text, because the site has no lane
 * called "Occasion", only `modest-wedding-guest` (kind: 'occasion', nav:
 * 'Wedding'). It carried the reference screenshot's label over a lane with a
 * different name.
 *
 * KNOWN COST, stated rather than buried: this tile was `/modest-wedding-guest`'s
 * most prominent internal link, and the footer column that used to hold it was
 * cut on 2026-08-24 (see components/Footer.tsx). The lane is not orphaned — it
 * is still routed, still in sitemap.xml, and still linked contextually from
 * `/modest-dresses` via `related` in lib/laneAnswers.ts — but it is now down to
 * that one link, against 25-35 for every category lane. If it should keep a
 * more prominent one, the cheap fix Footer.tsx already names is a single line
 * in "The House", not a restored tile.
 *
 * Icons: Phosphor has no literal abaya or hijab/headscarf icon — checked
 * the full set (`Dress`, `CoatHanger`, `StackSimple`, `Hoodie`, `Wind`,
 * `Waves`, `CircleHalf` all considered) before picking these. They're the
 * closest honest stand-ins within the house icon set (CLAUDE.md §6: every
 * icon comes from Phosphor, never hand-drawn line art), not literal
 * abaya/hijab silhouettes the way the reference's own icons are.
 *
 * COLOUR, 2026-08-24 — Tina: "can i get this strip back but make the icons and
 * text purple." Icon, label and arrow were `--brass` / `--ink` / `--brass`; all
 * three are now `--aubergine` (#441943), the brand's dark purple. Aubergine and
 * not `--plum` (#6e4a6b) because the label sits at 13px with 0.14em tracking on
 * `--parchment` and plum would lighten it noticeably against the ink it
 * replaces; aubergine keeps the strip's weight and only changes its hue.
 * Contrast on parchment is ~9.9:1, well past AA.
 *
 * NOT the same request as 2026-08-22's purple round, which put aubergine/
 * blackberry on the tile BACKGROUNDS with white text and was reverted whole
 * (docs/log/2026-08-22-revert-hero-zoom-and-category-band.md). The background
 * stays parchment here; only the foreground is purple.
 */
function findLane(slug: string) {
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) throw new Error(`CategoryQuickLinks: unknown lane slug "${slug}"`);
  return lane;
}

const ITEMS = [
  { lane: findLane('modest-abayas'), label: 'Abayas', Icon: CoatHanger },
  { lane: findLane('modest-dresses'), label: 'Dresses', Icon: Dress },
  { lane: findLane('modest-sets'), label: 'Sets', Icon: StackSimple },
  { lane: findLane('modest-hijabs'), label: 'Hijabs', Icon: Waves },
];

export default function CategoryQuickLinks() {
  return (
    <section style={{ background: 'var(--parchment)', borderBottom: '1px solid var(--hairline)' }}>
      {/* Single row at every width — mobile scrolls it (same pattern as
          EditorsRail's rail below), desktop stretches each tile to an equal
          fifth. Staying one row (never wrapping) is what keeps the
          "border-right on every item but the last" divider logic correct
          without extra per-breakpoint cases. */}
      <div className="flex overflow-x-auto no-scrollbar lg:overflow-visible">
        {ITEMS.map(({ lane, label, Icon }, i) => (
          <Link
            key={lane.slug}
            href={`/${lane.slug}`}
            className="group flex flex-shrink-0 lg:flex-1 flex-col items-center justify-center gap-3 py-8 px-6 text-center min-w-[150px] lg:min-w-0"
            style={{ borderRight: i < ITEMS.length - 1 ? '1px solid var(--hairline)' : undefined }}
          >
            <Icon size={26} weight="thin" style={{ color: 'var(--aubergine)' }} aria-hidden="true" />
            <span
              className="inline-flex items-center gap-1.5 whitespace-nowrap"
              style={{
                fontFamily: 'var(--font-label), serif',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontSize: 13,
                color: 'var(--aubergine)',
              }}
            >
              {label}
              <ArrowRight
                size={12}
                weight="bold"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ color: 'var(--aubergine)' }}
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
