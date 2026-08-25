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
      {/* ONE ROW AT EVERY WIDTH, sized down to fit a phone.
          Tina, 2026-08-25, on the 2x2 version: "i want this to be next to one
          another make it smaller to fit phones".

          This replaces the 2x2 grid added earlier the same day, which itself
          replaced a horizontal SCROLLER ("in my iphone the catagories are in one
          big line can we fix that" — measured then at scrollWidth 600 vs
          clientWidth 390, so Hijabs sat entirely off-screen). Both of those are
          worth knowing about, because the failure mode to avoid here is
          returning to that scroller: four tiles in one row only works if the
          contents actually SHRINK, which is why the sizes below are responsive
          rather than fixed.

          Measured after: at 320px — the narrowest phone still in use — the four
          tiles are 80px each and the row's scrollWidth equals its clientWidth in
          both engines, so nothing is hidden behind a gesture.

          Sizes are Tailwind classes, not the inline `style` this file uses for
          colour, because an inline style cannot be responsive. Colour stays
          inline per §6. Tailwind's w/h beat the SVG's own width/height
          attributes, so the icon's `size` prop is the desktop value and the
          classes override it below lg. */}
      <div className="flex">
        {ITEMS.map(({ lane, label, Icon }, i) => {
          // One row at every width, so the divider rule is the simple one again:
          // a right border on all but the last tile.
          const border = i < ITEMS.length - 1 ? 'border-r' : '';
          return (
          <Link
            key={lane.slug}
            href={`/${lane.slug}`}
            className={`group flex flex-1 min-w-0 flex-col items-center justify-center gap-1.5 lg:gap-3 py-4 lg:py-8 px-1 lg:px-6 text-center ${border}`}
            style={{ borderColor: 'var(--hairline)' }}
          >
            <Icon
              size={26}
              weight="thin"
              className="w-[18px] h-[18px] lg:w-[26px] lg:h-[26px]"
              style={{ color: 'var(--aubergine)' }}
              aria-hidden="true"
            />
            <span
              className="inline-flex items-center gap-1 lg:gap-1.5 whitespace-nowrap text-[10px] lg:text-[13px] tracking-[0.06em] lg:tracking-[0.14em]"
              style={{
                fontFamily: 'var(--font-label), serif',
                textTransform: 'uppercase',
                color: 'var(--aubergine)',
              }}
            >
              {label}
              <ArrowRight
                size={12}
                weight="bold"
                className="w-2.5 h-2.5 lg:w-3 lg:h-3 transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ color: 'var(--aubergine)' }}
              />
            </span>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
