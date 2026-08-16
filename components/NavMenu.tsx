'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NavigationMenu } from '@base-ui-components/react/navigation-menu';
import { Menu } from '@base-ui-components/react/menu';
import { CaretDown, CaretRight } from '@phosphor-icons/react';

/**
 * The header navigation menu, built on Base UI's NavigationMenu primitive.
 *
 * WHY A PRIMITIVE. The hand-rolled dropdown it replaces opened on
 * `onMouseEnter`, so on a touch device there is no hover and the menu was
 * effectively unreachable. Base UI handles pointer, touch, keyboard (arrow keys,
 * Home/End, Escape), focus trapping and collision-aware positioning.
 *
 * WHY NOT THE shadcn VERSION. This is not a shadcn project — no `cn`, no
 * `components/ui`, no `--background`/`--accent`/`--popover` tokens. Every colour,
 * border and shadow below is an inline `var(--token)` per CLAUDE.md §6; Tailwind
 * is used for layout and motion only. No class-variance-authority, and no
 * lucide — the house icon set is @phosphor-icons.
 */

export type NavItem = {
  href: string;
  label: string;
  /** When present, this row opens a hover flyout of narrower links instead of
   *  being a plain NavigationMenu.Link — Outerwear's Blazers/Vests/Cardigans/
   *  Coats as of 2026-08-13. NavigationMenu has no row-level submenu of its
   *  own (only a `nested` root-composition prop for composing independent
   *  instances), so this one row is a self-contained Base UI `Menu` dropped
   *  inside the outer NavigationMenu.Content — the same primitive already
   *  proven for the currency switcher, not a rebuild of the whole panel. */
  subItems?: { href: string; label: string }[];
  /** True for a subItems row that sits in the LEFT column of the Products
   *  panel's 2-column grid (only Hijabs & Scarves today) — added 2026-08-16.
   *  Its `side="right"` flyout otherwise opens directly on top of the RIGHT
   *  column's own rows (Layering Basics, Outerwear sit at overlapping
   *  heights): measured live, column 1 ends at x≈758, column 2 spans
   *  x≈782–969, so the flyout's default 2px offset lands squarely inside
   *  column 2. This was the actual cause of "when i hover over and want to
   *  click onn one of the sub catagories it dissapears" / "the block closes
   *  in slow motion" — not a timing race at all (the two closeDelay
   *  widenings that came before this didn't fix it, because there was
   *  nothing wrong with the timing): the pointer visually lands ON the
   *  still-open Hijabs flyout instead of reaching the Layering Basics/
   *  Outerwear row underneath it, so hovering "down" from Hijabs never
   *  opens the row you're actually trying to reach, and whatever happens
   *  next reads as the panel getting confused and eventually closing.
   *  Right-column rows (Layering Basics, Outerwear) don't need this — there
   *  is no column 3 for their own flyouts to collide with. */
  wideFlyoutOffset?: boolean;
};

/** Phosphor CaretDown, not a hand-drawn path (CLAUDE.md §6). The old inline
 *  <svg> was a 1.2px stroke with round caps, against Phosphor's own geometry on
 *  every other caret in the header — visibly a different pen at the same size.
 *  The rotate-on-open class carries over unchanged. */
function Chevron() {
  return (
    <CaretDown
      size={10}
      weight="bold"
      aria-hidden="true"
      className="ms-1.5 transition-transform duration-200 group-data-[popup-open]:rotate-180"
    />
  );
}

export function NavMenu({
  groups,
  links,
  path,
}: {
  groups: {
    label: string;
    href?: string;
    activeWhen: boolean;
    items: NavItem[];
    /** How many columns the panel is split into. */
    columns?: number;
    /** Fill order. 'down' stacks each column top-to-bottom before starting the
     *  next (so with 9 items in 2 columns you get 5 + 4); the default fills
     *  left-to-right across each row. The row count is derived either way, so
     *  the shape holds if items are added. */
    flow?: 'across' | 'down';
  }[];
  links: { href: string; label: string; activeWhen: boolean }[];
  path: string;
}) {
  // Controlled `value`, entirely to make the Outerwear flyout below survive
  // the trip from its trigger to itself. NavigationMenu's own close-tracking
  // only knows about DOM it controls — its Trigger and Popup/Viewport — and
  // defaults to a 50ms close delay once the pointer leaves them (Base UI's
  // NAVIGATION_MENU constants). The flyout is a SEPARATE Menu.Root portalled
  // to document.body, so moving the pointer off "Outerwear" and into it
  // reads, to NavigationMenu, as having left entirely: it starts closing
  // before the flyout is reachable. Tina: "when i stand on one of the sub
  // catagories the box just dissepears before i can click".
  //
  // Two things went wrong before landing here, both confirmed live rather
  // than assumed:
  // 1. Vetoing every auto-close attempt for as long as the flyout was
  //    conceptually open (a plain onOpenChange boolean) is not enough on its
  //    own. NavigationMenu decides to close exactly once per pointer-leave
  //    and, once vetoed, does not retry — nothing ever asks it to close
  //    again. Confirmed: moved the pointer fully away and waited, the panel
  //    just sat open.
  // 2. Fixing that with an active pointermove check gated on the SAME
  //    "flyout open" boolean still raced the click: `closeOnClick` on the
  //    sub-item closes the flyout (and tore down the listener) at the same
  //    moment navigation starts, so by the time the pointer next moved, the
  //    thing meant to notice had already unmounted. Confirmed via the DOM
  //    directly — `[role="menu"]` count 0 (flyout genuinely closed) while
  //    the outer trigger still read `aria-expanded="true"` (outer stuck).
  //
  // What actually holds: a check that runs for as long as the OUTER is open
  // (`navValue !== null`), not tied to the flyout's own lifecycle, using
  // `elementFromPoint` rather than either primitive's internal notion of
  // "inside" — real geometry, not trust. "Still relevant" means the pointer
  // is over the header (covers every trigger, not just this one), the outer
  // popup, or the flyout popup (checked via `.contains()`, which works across
  // the portal boundary since portals are still real DOM under `document`).
  // A short grace timer absorbs momentary boundary crossings during transit
  // instead of closing on the first false reading. The click case is ALSO
  // handled directly and immediately at the `onClick` below — not because
  // this check can't eventually catch it too, but because "eventually" means
  // "whenever the pointer next so much as twitches," and a click that isn't
  // followed by any mouse movement should not leave a stale panel open.
  const [navValue, setNavValue] = useState<string | null>(null);
  const outerPopupRef = useRef<HTMLElement | null>(null);
  // Whether the pointer is CURRENTLY somewhere relevant (header, outer popup,
  // or the flyout — checked live by the same geometry the active closer below
  // uses), not whether the flyout happens to be open. An earlier cut vetoed
  // on the flyout's own open/closed boolean and shipped a third bug: the veto
  // blocked while the flyout was open, but the moment it closed — for ANY
  // reason, including simply moving on to a different row in the still-open
  // outer panel — the veto lifted and let through whatever close
  // NavigationMenu had already queued up from the ORIGINAL leave-the-trigger
  // event, closing the whole panel out from under a pointer that was still
  // legitimately hovering it. Confirmed live: flyout → Blazers → back across
  // into "Modest Dresses" closed the entire Products panel, trigger included.
  // Keying the veto off live position instead means it and the active closer
  // always agree — never a stale answer from a moment that has already passed.
  const pointerRelevant = useRef(false);
  // Set from the flyout row's own onPointerDown below, read in its onClick —
  // lets that one row tell mouse and touch activation apart without a
  // library flag for it (Menu.Trigger has none). See the row's onClick
  // comment for why this matters.
  const lastPointerType = useRef<string>('mouse');
  const router = useRouter();

  const closeAll = () => setNavValue(null);

  useEffect(() => {
    if (navValue === null) return;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const onPointerMove = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      // `.closest('[data-nav-subflyout]')`, NOT a stored ref to one specific
      // flyout popup — found 2026-08-16 as the real bug behind "the block
      // closes in slow motion" (Tina, after the two closeDelay widenings
      // didn't fix it): there are THREE separate sub-flyouts (Outerwear,
      // Layering Basics, Hijabs & Scarves), each its own <Menu.Root>, but
      // `flyoutPopupRef` was ONE ref shared across all three Menu.Popup
      // elements. Whichever one most recently mounted/unmounted wins
      // `.current` — so this check could easily end up testing the pointer
      // against a DIFFERENT (hidden) flyout's DOM node than the one
      // actually open and hovered, reading a real hover as "not relevant"
      // and queuing a close that had nothing to do with an actual
      // pointer-leave. The widened delays before this just made that
      // eventual, spurious close visibly slower, not correct. A live
      // `closest()` query has no shared-state problem: it always finds
      // whichever flyout DOM the pointer is actually over, current mount or
      // not.
      const stillRelevant =
        !!target &&
        (!!target.closest('header') ||
          (!!outerPopupRef.current && outerPopupRef.current.contains(target)) ||
          !!target.closest('[data-nav-subflyout]'));
      pointerRelevant.current = stillRelevant;
      if (stillRelevant) {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      } else if (!closeTimer) {
        // 150ms -> 400ms 2026-08-16 (band-aid for the disappearing-flyout
        // bug) -> back to 150ms same day, once the REAL cause of that bug
        // was found and fixed: column-1 flyouts (Hijabs & Scarves)
        // physically occluding column-2 rows (see `wideFlyoutOffset` on
        // NavItem). The 400ms widening was compensating for a geometry bug
        // by giving misreads more time to self-correct — it worked, but at
        // the cost Tina reported next: "when you hove on one and the other
        // was open it freezes for about 2 seconds and then disspears, that
        // too late". Measured live: with 400/400ms, an ordinary flyout-to-
        // flyout switch took ~700ms wall-clock before the stale one
        // cleared — clearly perceptible as a stall, not a snappy hover.
        // Now that occlusion is fixed at the geometry level, this timer
        // only needs to cover genuine pointer-transit imprecision (a real
        // trackpad's coarser steps vs. a mouse), which is what 150ms was
        // originally sized for and is still enough for.
        closeTimer = setTimeout(closeAll, 150);
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (closeTimer) clearTimeout(closeTimer);
      pointerRelevant.current = false;
    };
  }, [navValue]);

  return (
    <NavigationMenu.Root
      value={navValue}
      onValueChange={(value) => {
        if (value === null && pointerRelevant.current) return;
        setNavValue(value);
      }}
      // `flex items-center` rather than a plain block. As a block, the inline-flex
      // children sat in a LINE BOX whose leading pushed the menu items 0.75px
      // below the plain links beside them (measured: top 47.75 vs 47.00). A flex
      // container has no line box, so every nav item shares one vertical centre.
      className="relative flex items-center"
    >
      <NavigationMenu.List
        // Base UI's Composite layer stamps aria-orientation onto this <ul>.
        // aria-orientation is not a permitted attribute on a list, so axe flags
        // it as `aria-allowed-attr` (critical) on every page of the site.
        aria-orientation={undefined}
        className="flex items-center gap-5 md:gap-7 list-none m-0 p-0"
      >
        {groups.map((g) => (
          <NavigationMenu.Item key={g.label} className="relative flex items-center">
            <NavigationMenu.Trigger
              className="nav-link group inline-flex items-center"
              data-active={g.activeWhen}
              // Directory keeps its own page: rendering the trigger as a Link
              // preserves click-to-navigate, while hover and keyboard still open
              // the panel. Groups without an href stay buttons, which is what
              // makes them openable by tap.
              render={g.href ? <Link href={g.href} /> : undefined}
            >
              {g.label}
              <Chevron />
            </NavigationMenu.Trigger>

            <NavigationMenu.Content
              className={
                'p-3 transition-[opacity,transform] duration-200 ease-out ' +
                'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 ' +
                'data-[starting-style]:-translate-y-1 data-[ending-style]:-translate-y-1'
              }
            >
              <div
                className="grid gap-x-6"
                // max-content, NOT minmax(0,1fr): the panel shrink-to-fits, and
                // minmax(0,…) lets a column shrink below its content width, which
                // made the whitespace-nowrap labels overlap. max-content sizes
                // each column to its widest label.
                style={
                  g.flow === 'down'
                    ? {
                        // Explicit ROWS + column flow. Setting grid-template-columns
                        // would fill left-to-right and interleave the two lists;
                        // pinning the row count is what makes each column read
                        // straight down. gridAutoColumns must be max-content too,
                        // since the columns here are implicit tracks.
                        gridTemplateRows: `repeat(${Math.ceil(
                          g.items.length / (g.columns ?? 1)
                        )}, auto)`,
                        gridAutoFlow: 'column',
                        gridAutoColumns: 'max-content',
                      }
                    : { gridTemplateColumns: `repeat(${g.columns ?? 1}, max-content)` }
                }
              >
                {g.items.map((it) =>
                  it.subItems ? (
                    <Menu.Root key={it.href}>
                      <Menu.Trigger
                        // STILL NOT rendered as a Link — that was tried once
                        // (2026-08-13) and caused a real touch bug: unlike
                        // Products, whose NavigationMenu.Trigger has NATIVE
                        // tap-opens-first handling, Menu.Trigger has none, so
                        // bolting a Link on meant a TOUCH tap navigated to the
                        // bare href immediately WHILE the flyout separately
                        // opened on top of the page it had just left (caught
                        // by scripts/interaction-audit.mjs's ipad-1366 pass).
                        // Fixed differently 2026-08-15 (Tina: "make it able to
                        // click on this and being able to open all" — a first
                        // attempt that added a separate "All X" flyout entry
                        // instead of this missed what she was asking for):
                        // onClick below navigates directly, but ONLY when
                        // lastPointerType.current is 'mouse' — set by the
                        // onPointerDown just below it, the same signal already
                        // used for the mouse-press swallow. A touch tap still
                        // just opens the flyout, exactly as before; a mouse
                        // click navigates AND closes the panel. This sidesteps
                        // the 2026-08-13 bug entirely because the element is
                        // still not an `<a>` — there's no default browser
                        // navigation for a touch tap to fire in the first
                        // place, only this explicit, pointer-type-gated one.
                        openOnHover
                        delay={0}
                        // 120ms -> 400ms 2026-08-16 -> back to 150ms same
                        // day. Same story as the OUTER navValue closeTimer
                        // above in this file: 400ms was a band-aid for the
                        // column-occlusion bug (now fixed via
                        // `wideFlyoutOffset`), and left at 400ms it made
                        // every flyout-to-flyout switch visibly stall
                        // (Tina: "it freezes for about 2 seconds and then
                        // disspears, that too late" — measured ~700ms
                        // wall-clock, not literally 2s, but clearly a stall
                        // rather than a hover response). This is Base UI's
                        // own built-in hover-close for THIS inner
                        // Menu.Root's popup, independent of the outer
                        // navValue mechanism above — both were widened
                        // together and are being brought back down
                        // together, now that neither needs to cover for a
                        // geometry bug.
                        closeDelay={150}
                        onPointerDown={(e) => {
                          lastPointerType.current = e.pointerType;
                          if (e.pointerType === 'mouse') {
                            // Same fix as CurrencySwitcher.tsx's — Base UI
                            // promotes a hover-opened menu to click-opened on
                            // a mouse press, which then never closes on
                            // hover-out. Swallowing the press prevents that
                            // promotion; the onClick below still fires
                            // normally afterward.
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onClick={() => {
                          if (lastPointerType.current !== 'mouse') return;
                          closeAll();
                          router.push(it.href);
                        }}
                        className="menu-row flex items-center justify-between"
                        data-active={path === it.href}
                      >
                        {it.label}
                        <CaretRight size={11} weight="bold" aria-hidden="true" className="ms-2 opacity-60" />
                      </Menu.Trigger>
                      <Menu.Portal>
                        <Menu.Positioner
                          side="right"
                          alignOffset={-8}
                          // A column-1 row's flyout otherwise opens directly
                          // on top of column 2's own rows — see the
                          // `wideFlyoutOffset` doc comment on NavItem above.
                          // 230px is measured to clear column 2's right edge
                          // (x≈969) from column 1's right edge (x≈758) with a
                          // safety margin, not just its near edge.
                          sideOffset={it.wideFlyoutOffset ? 230 : 2}
                          collisionPadding={12}
                          className="z-50"
                        >
                          <Menu.Popup
                            data-nav-subflyout
                            className="rounded-xl border p-2 min-w-[180px] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
                            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
                          >
                            {it.subItems.map((s) => (
                              <Menu.Item
                                key={s.href}
                                render={<Link href={s.href} />}
                                className="menu-row"
                                closeOnClick
                                // Belt and suspenders with the pointermove
                                // check above: a click is a definitive "done
                                // here" signal, so close the OUTER panel right
                                // now rather than waiting for the pointer to
                                // next move at all (it might not — reading the
                                // destination page doesn't require moving the
                                // mouse).
                                onClick={closeAll}
                              >
                                {s.label}
                              </Menu.Item>
                            ))}
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.Root>
                  ) : (
                    <NavigationMenu.Link
                      key={it.href}
                      render={<Link href={it.href} />}
                      // .menu-row, NOT `block nav-link`. `.nav-link` is the
                      // horizontal-header class and sets `justify-content: center`
                      // (globals.css) — so every option in this panel rendered
                      // centred inside its column, and the two columns read as two
                      // ragged centred stacks rather than two lists. Tailwind
                      // cannot override it (`block`, `justify-start`, `text-left`
                      // all live in @layer utilities, and an unlayered rule beats
                      // any layered one), which is exactly why .menu-row exists.
                      // Same fix as the currency menu and the filter dropdowns.
                      className="menu-row"
                      data-active={path === it.href}
                    >
                      {it.label}
                    </NavigationMenu.Link>
                  )
                )}
              </div>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}

        {links.map((l) => (
          <NavigationMenu.Item key={l.href} className="flex items-center">
            <NavigationMenu.Link
              render={<Link href={l.href} />}
              className="nav-link"
              data-active={l.activeWhen}
            >
              {l.label}
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>

      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          sideOffset={12}
          collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
          className="z-50 box-border h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-[250ms] ease-out data-[instant]:transition-none"
        >
          <NavigationMenu.Popup
            ref={outerPopupRef}
            className="relative h-[var(--popup-height)] w-[var(--popup-width)] origin-[var(--transform-origin)] overflow-hidden rounded-2xl border transition-[opacity,transform,width,height] duration-200 ease-out data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            style={{
              background: '#fff',
              borderColor: 'var(--hairline)',
              boxShadow: '0 8px 30px rgba(43,38,34,0.14)',
            }}
          >
            <NavigationMenu.Viewport className="relative h-full w-full overflow-hidden" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
