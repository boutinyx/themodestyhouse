import Link from 'next/link';
// ssr entrypoint — this renders inside app/page.tsx, a server component
// (CLAUDE.md §6), so it stays a server component too rather than forcing a
// 'use client' boundary onto the homepage for a row of plain links.
import { ArrowRight, Dress, CoatHanger, StackSimple, Waves, Sparkle } from '@phosphor-icons/react/dist/ssr';
import { LANES } from '@/lib/lanes';

/**
 * The icon strip directly under the homepage hero — Tina's reference
 * screenshot (aabcollection.com's own hero-adjacent row), 2026-08-21:
 * "i want this on the hero."
 *
 * Five REAL lanes, not five invented ones. Slugs are looked up from
 * lib/lanes.ts by name (findLane throws if one goes missing) rather than
 * hand-copied as bare strings, so a future slug rename can't silently
 * produce a dead link here without breaking the build.
 *
 * "Occasion" is the one label that doesn't match its lane's own `nav` text.
 * The site has no lane literally called "Occasion" — only
 * `modest-wedding-guest` (kind: 'occasion', nav: 'Wedding'), which IS the
 * one lane that's actually occasion-based dressing (weddings + formal wear,
 * per its own match() in lib/lanes.ts). This tile is labelled the way
 * Tina's reference showed it while still linking somewhere real, not
 * invented — flagged here rather than silently relabelling her ask.
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
  { lane: findLane('modest-wedding-guest'), label: 'Occasion', Icon: Sparkle },
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
