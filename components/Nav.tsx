'use client';
import { usePathname } from 'next/navigation';
import { CATEGORY_LANES } from '@/lib/lanes';
import {
  LAYERING_SUBTYPE_LABELS, HIJAB_SUBTYPE_LABELS,
  type LayeringSubtype, type HijabSubtype,
} from '@/lib/specialty';
import { NavMenu, type NavItem, type NavGroup, type NavLink } from './NavMenu';

// The outerwear subtype lists that used to live here (BLAZER_VEST_SUBTYPES,
// CARDIGAN_SWEATER_SUBTYPES) fed the hover flyouts off "Blazers & Vests" and
// "Cardigans & Sweaters". Removed 2026-08-22 with the flyouts themselves —
// Tina, sending a screenshot of the Blazers/Vests popout: "needs to go all of
// these sub thingies". OUTERWEAR_SUBTYPE_LABELS is still exported and still
// used by the lane pages' own Type filter and by MobileNav.
// Insertion order of the LAYERING_SUBTYPE_LABELS/HIJAB_SUBTYPE_LABELS object
// literals — same source components/FilterableGrid.tsx and
// lib/compactCatalogue.ts read.
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
const HIJAB_SUBTYPES = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];

export function Nav() {
  const path = usePathname();
  // Hijabs & Scarves and Layering Basics excluded here — both are their own
  // top-level groups below now (Hijabs: 2026-08-21, "put in clothing
  // designers hijabs editorial about"; Layering Basics, renamed "Basics":
  // same day, "i want the catagory hijabs to be next to hijabs and next to
  // that layering basics is going to be basics" — confirmed via the
  // clarifying question as: move Hijabs next to Clothing, and promote
  // Layering Basics to its own top-level "Basics" trigger beside it).
  // Keeping either out of BOTH places would silently drop it from the
  // header entirely, so this filter and the two standalone groups below are
  // two halves of one change each.
  // Researched from the actual aab reference's DOM/CSS 2026-08-21 (Tina:
  // "check their fucking website" — the screenshot alone undersold this):
  // their panel isn't one flat list split into two columns, it's TWO
  // separate grouped lists ("All Clothing" + garment types, "What To Wear"
  // + occasion types), each led by a bold "All X" header link
  // (`class="w-bold link"` vs `w-medium` for the rest). We have no
  // occasion-based grouping to mirror "What To Wear" with, but the leading
  // bold "All Clothing" link is directly portable — NavMenu.tsx bolds
  // whichever item sits first in a group's panel.
  const categoryItems: NavItem[] = [
    { href: '/directory', label: 'All Clothing' },
    ...CATEGORY_LANES.filter((l) =>
      l.slug !== 'modest-hijabs' && l.slug !== 'layering-basics' &&
      // Swim and Activewear moved out to their own top-level "Active" trigger
      // 2026-08-22 (Tina: "I want a new catagory called active... were gonna
      // put in swimwear and activewear") — same exclusion shape as Hijabs/
      // Basics above. Nav-only: both lanes are still two separate pages (see
      // activeItems below), just no longer reachable via the Clothing panel.
      l.slug !== 'modest-swimwear' && l.slug !== 'modest-activewear'
    ).map((l) => ({
    href: `/${l.slug}`,
    label: l.title,
    // Every category row is now a plain link to its lane and nothing more.
    // "Blazers & Vests" and "Cardigans & Sweaters" were the last two rows
    // carrying `subItems` — a hover flyout out to the right holding
    // Blazers/Vests and Cardigans/Sweaters, each pre-filtering the lane via
    // ?type=. Gone 2026-08-22 at Tina's request. The ?type= destinations are
    // NOT gone: the lane pages' own Type filter, the phone menu and the
    // sitemap all still reach them.
    })),
  ];

  // Hijabs' and Basics' subtypes (khimars/jilbabs/undercaps; cardigans/
  // vests/etc.) used to be nested flyouts off a row inside Clothing's
  // panel; now that each is its own top-level trigger, they're just that
  // group's own items directly — one fewer layer of nesting, and the
  // column-occlusion problem that needed `wideFlyoutOffset` (CLAUDE.md
  // §10.34/§10.36) can't recur here, since there's no column 2 beside
  // either to collide with.
  const hijabItems: NavItem[] = [
    { href: '/modest-hijabs', label: 'All Hijabs & Scarves' },
    ...HIJAB_SUBTYPES.map((t) => ({
      href: `/modest-hijabs?type=${t}`,
      label: HIJAB_SUBTYPE_LABELS[t],
    })),
  ];

  // "Basics" — Layering Basics, renamed and promoted to its own top-level
  // trigger 2026-08-21 (Tina: "next to that layering basics is going to be
  // basics", confirmed via clarifying question: sits right after Hijabs).
  // "All Layering Basics" keeps the lane's real title, not the shortened
  // trigger label — same convention as Hijabs' "All Hijabs & Scarves" above.
  const basicsItems: NavItem[] = [
    { href: '/layering-basics', label: 'All Layering Basics' },
    ...LAYERING_SUBTYPES.map((t) => ({
      href: `/layering-basics?type=${t}`,
      label: LAYERING_SUBTYPE_LABELS[t],
    })),
  ];

  // "Active" — a nav-only grouping added 2026-08-22 (Tina: "a brand new
  // catagory but were gonna put in swimwear and activewear"), confirmed via
  // clarifying question: NOT a merged lane — modest-swimwear and
  // modest-activewear stay two separate pages with their own products, same
  // as they always were. This trigger just gathers the two links that used
  // to sit inside Clothing's own panel (see the CATEGORY_LANES filter above)
  // under one heading of their own, matching the Hijabs/Basics treatment
  // without touching lib/lanes.ts, routing, or either lane's `match()`.
  const activeItems: NavItem[] = [
    { href: '/modest-swimwear', label: 'Modest Swimwear' },
    { href: '/modest-activewear', label: 'Modest Activewear' },
  ];

  // ONE ordered array — Clothing, Designers, Hijabs, Editorial, About, in
  // that exact order (Tina's list, 2026-08-21, matching the layout she sent:
  // "put in clothing designers hijabs editorial about"). NavMenu renders
  // groups and links in whatever order they appear here, which is the whole
  // reason `items` replaced the old separate `groups`/`links` props — see
  // NavMenu.tsx's own comment on why.
  // Order: Clothing, Hijabs, Basics, Designers, Editorial, About — Hijabs
  // and Basics both moved up next to Clothing 2026-08-21 (previously Hijabs
  // sat after Designers; Basics didn't exist as a top-level item at all).
  const navItems: (NavGroup | NavLink)[] = [
    {
      kind: 'group',
      // Renamed from "Products" 2026-08-21, same request as above.
      label: 'Clothing',
      href: '/directory',
      activeWhen:
        path === '/directory' ||
        (path.startsWith('/modest') && !path.startsWith('/modest-hijabs')) ||
        path.startsWith('/blazers-vests') ||
        path.startsWith('/cardigans-sweaters') ||
        path.startsWith('/jackets-coats'),
      items: categoryItems,
      // Two columns, each read top-to-bottom: 12 items ("All Clothing" + 11
      // categories, Hijabs and Layering Basics excluded) split 6 + 6. The
      // row count is derived from the item count, so adding a category
      // lengthens the columns rather than breaking the shape.
      columns: 2,
      flow: 'down',
      // Mega-menu treatment — extra padding and a wider column gap; see
      // NavGroup.wide's doc comment in NavMenu.tsx. No divider between the
      // two columns — checked against a live Playwright render of aab's own
      // site 2026-08-21: their divider separates the text block from their
      // image tiles (which this build doesn't have), not the two text
      // columns from each other. The bigger sans-serif row style
      // (.mega-row) applies to every group's panel regardless of `wide`,
      // including Hijabs/Basics below — `wide` only controls the panel's
      // WIDTH/spacing, so no trigger opens into a different typographic
      // language than the others.
      wide: true,
    },
    {
      kind: 'group',
      label: 'Hijabs',
      href: '/modest-hijabs',
      activeWhen: path.startsWith('/modest-hijabs'),
      items: hijabItems,
      columns: 1,
      // Same flush full-width panel as Clothing (2026-08-21, Tina: "can i
      // get the same thing for clothing for hijabs basics?") — previously
      // Hijabs/Basics kept the old compact floating-card dropdown while
      // only Clothing got the "extension of the header" treatment; now all
      // three triggers open the same way, single column left-aligned in
      // the full-width bar rather than a small popup.
      wide: true,
    },
    {
      kind: 'group',
      label: 'Basics',
      href: '/layering-basics',
      activeWhen: path.startsWith('/layering-basics'),
      items: basicsItems,
      columns: 1,
      wide: true,
    },
    {
      kind: 'group',
      label: 'Active',
      // No `href` — unlike Clothing/Hijabs/Basics, "Active" has no lane page
      // of its own to click through to (see activeItems above), so the
      // trigger stays a plain button that only opens the panel, same as any
      // group without an href (NavMenu.tsx: `nativeButton={!entry.href}`).
      activeWhen: path.startsWith('/modest-swimwear') || path.startsWith('/modest-activewear'),
      items: activeItems,
      columns: 1,
      wide: true,
    },
    { kind: 'link', href: '/designers', label: 'Designers', activeWhen: path.startsWith('/designers') },
    { kind: 'link', href: '/editorial', label: 'Editorial', activeWhen: path.startsWith('/editorial') },
    { kind: 'link', href: '/about', label: 'About', activeWhen: path.startsWith('/about') },
  ];

  return <NavMenu path={path} items={navItems} />;
}
