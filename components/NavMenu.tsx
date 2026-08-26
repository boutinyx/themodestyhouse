'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { NavigationMenu } from '@base-ui-components/react/navigation-menu';
import { CaretDown } from '@phosphor-icons/react';

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

// Every row in a panel is a plain link. There used to be a `subItems` field
// here: a row carrying it rendered as a self-contained Base UI `Menu` inside
// the outer NavigationMenu.Content and popped a hover flyout of narrower
// links out to its right (Outerwear's Blazers/Vests, later Blazers & Vests /
// Cardigans & Sweaters). REMOVED 2026-08-22 at Tina's request — she sent a
// screenshot of the Blazers/Vests flyout: "needs to go all of these sub
// thingies".
//
// Worth knowing before anyone reintroduces one: composing that nested,
// portalled Menu with the outer NavigationMenu cost four separate live bugs
// over three days and is written up at length in CLAUDE.md §10.34 and
// §10.36 — a vetoed close that never retried, a listener torn down by the
// sub-item's own click, a veto keyed to the wrong lifecycle, and finally the
// real one, a column-1 flyout physically landing on top of column-2's rows.
// The `?type=` destinations those flyouts pointed at are all still live and
// still reachable (the lane pages' own Type filter, the phone menu, the
// sitemap) — only the hover flyout is gone.
export type NavItem = {
  href: string;
  label: string;
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

/** A dropdown trigger (Products/Clothing, Hijabs) — hover/click opens a panel
 *  of `items`. */
export type NavGroup = {
  kind: 'group';
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
  /** Mega-menu treatment (2026-08-21, matching aabcollection.com's "CLOTHING"
   *  panel — Tina: "i want my header to open like that and look like the
   *  when opened"): bigger sans-serif type (`.mega-row`, not the shared
   *  `.menu-row` the currency switcher and filter dropdowns also use — this
   *  is its own surface), roomier spacing, and a hairline divider between
   *  columns. Only meaningful with `columns > 1` and `flow: 'down'`. */
  wide?: boolean;
};
/** A plain top-level link (Designers, Editorial, About) — no panel. */
export type NavLink = { kind: 'link'; href: string; label: string; activeWhen: boolean };

export function NavMenu({
  items,
  path,
}: {
  /** ONE ordered list mixing groups and links — added 2026-08-21 so the
   *  header can put a dropdown (Hijabs) BETWEEN two plain links (Designers,
   *  Editorial) and have it render in that position. The previous shape
   *  (separate `groups`/`links` arrays, each rendered as its own contiguous
   *  block) could only ever produce "every group, then every link" — Tina
   *  asked for Clothing, Designers, Hijabs, Editorial, About, in that
   *  exact order, which needs the two kinds interleaved. */
  items: (NavGroup | NavLink)[];
  path: string;
}) {
  // Controlled `value` rather than letting NavigationMenu own its own open
  // state, plus an `elementFromPoint`-based closer below.
  //
  // WHY IT IS STILL HERE NOW THAT THE FLYOUTS ARE GONE. All of this was
  // originally built to make the Outerwear sub-flyout survive the trip from
  // its trigger to itself: that flyout was a separate Menu.Root portalled to
  // <body>, which NavigationMenu's own close-tracking (Trigger + Popup only,
  // 50ms close delay) read as "the pointer left entirely". Those flyouts were
  // removed 2026-08-22 — but the machinery is NOT dead code, because the
  // `wide` panel is also DOM NavigationMenu does not control: it is a plain
  // sibling div rendered flush under the header row, deliberately not
  // Base UI's own Popup (see `wideActive` below for why). Hovering it has the
  // same shape as hovering the old flyout did. Deleting this would reproduce
  // "the panel closes before I can reach it" on the Clothing/Hijabs/Basics
  // panels themselves.
  //
  // The three cuts that did NOT work are worth keeping, because each one
  // looked fixed on the obvious manual pass and broke on one nobody runs by
  // habit (full write-up: CLAUDE.md §10.34/§10.36):
  // 1. Vetoing every auto-close while the nested thing was open. Not enough
  //    on its own: NavigationMenu decides to close exactly once per
  //    pointer-leave and, once vetoed, never retries. Confirmed — pointer
  //    moved fully away, waited, panel just sat open.
  // 2. Adding an active pointermove closer but gating it on that same
  //    boolean. Raced the click: the sub-item's own close tore the listener
  //    down at the same moment navigation started.
  // 3. Keying the veto to the nested widget's lifecycle instead of live
  //    pointer position. The instant it closed for ANY reason the veto lifted
  //    and let through a close NavigationMenu had queued much earlier.
  //
  // What holds: a check that runs for as long as the OUTER is open
  // (`navValue !== null`), using real geometry rather than either primitive's
  // internal notion of "inside", with a short grace timer to absorb momentary
  // boundary crossings instead of closing on the first false reading.
  const [navValue, setNavValue] = useState<string | null>(null);
  const outerPopupRef = useRef<HTMLElement | null>(null);
  // Whether the pointer is CURRENTLY somewhere relevant (the header or the
  // outer popup), checked live by the same geometry the active closer below
  // uses. LIVE, never a stored boolean — that was failure #3 above.
  const pointerRelevant = useRef(false);

  const closeAll = () => setNavValue(null);
  // Set right before `closeAll()` when closing happens WITHOUT the pointer
  // actually leaving the trigger (a click-to-navigate on the trigger
  // itself) — found live 2026-08-21, the real reason "when you lcick of a
  // catagory it stays open even when youre on the new page" survived even
  // after the trigger got its own `onClick={closeAll}`: confirmed via a
  // temporary console.log that `onValueChange` fired AGAIN with the SAME
  // group right after `closeAll()`, because the mouse hadn't moved and
  // Base UI's hover tracking re-affirmed "still hovering the trigger" as a
  // fresh open. `pointerRelevant` (below) only vetoes closes, not this —
  // this ref vetoes the REOPEN instead, and clears itself the moment the
  // pointer genuinely moves again (a real next hover-intent should still
  // work normally).
  const suppressReopen = useRef(false);
  const closeAllAndSuppressReopen = () => {
    suppressReopen.current = true;
    document.addEventListener(
      'pointermove',
      () => {
        suppressReopen.current = false;
      },
      { once: true }
    );
    closeAll();
  };

  // Whether the currently OPEN group is a `wide` one — every `wide` group
  // is currently all three (Clothing/Hijabs/Basics), but this is written
  // generally in case a future group opts out of `wide`. Still used below
  // to scope the pointer-events workaround (Base UI's own hover machinery
  // needs it regardless of close behaviour) even though it's no longer
  // used to change CLOSE behaviour — see the note on that reversal just
  // below.
  const activeGroupIsWide = items.some(
    (i) => i.kind === 'group' && !!i.wide && i.label === navValue
  );

  useEffect(() => {
    if (navValue === null) return;
    // Closes on hover-out the same way for every group now, wide or not —
    // reverted 2026-08-21 (Tina, after the aab-matching "doesn't close on
    // hover-out at all" behaviour shipped earlier the same day: "when you
    // hover over a catagory and hover down OUTSIDE of the block it still
    // stays there"). Matching aab exactly turned out to be the wrong call
    // once actually used: leaving a full-width panel open indefinitely
    // while the visitor has moved on to reading the page underneath it is
    // bad regardless of what the reference site does. The click-outside
    // closer and scroll-closer added alongside that attempt stay — they're
    // still useful, e.g. for touch/no-hover input — this just restores the
    // ordinary "pointer left the relevant area" close for the mouse case.
    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const onPointerMove = (e: PointerEvent) => {
      // Hover-out is not a gesture a touch screen has. The mouse-compat
      // pointermove that follows every touchend reports a STALE position, so
      // without this the panel schedules its own close 150ms after any tap.
      // Touch dismissal is the pointerdown-outside closer below, plus the
      // scroll closer, plus tapping the trigger again.
      if (window.matchMedia('(hover: none)').matches) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      // `elementFromPoint` + `.contains()` — real geometry, not either
      // primitive's internal notion of "inside". The outer popup is portalled
      // to <body>, so `.closest('header')` alone would read hovering the open
      // panel as having left. There used to be a third clause here for
      // `[data-nav-subflyout]`, the sub-flyouts' own portalled DOM; it went
      // with them 2026-08-22.
      const stillRelevant =
        !!target &&
        (!!target.closest('header') ||
          (!!outerPopupRef.current && outerPopupRef.current.contains(target)));
      pointerRelevant.current = stillRelevant;
      if (stillRelevant) {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      } else if (!closeTimer) {
// 150ms covers genuine pointer-transit imprecision (a real
        // trackpad's coarser steps vs. a mouse) and nothing more. It was
        // widened to 400ms on 2026-08-16 as a band-aid for the
        // disappearing-flyout bug and put straight back the same day once the
        // real cause was found — the widening only made a spurious close
        // slower, and Tina felt the cost immediately ("it freezes for about 2
        // seconds and then disspears, that too late"; measured ~700ms). Both
        // the bug and the flyouts are gone now (2026-08-22), but the number
        // and the reason for it stand.
        closeTimer = setTimeout(closeAll, 150);
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (closeTimer) clearTimeout(closeTimer);
      pointerRelevant.current = false;
    };
  }, [navValue, activeGroupIsWide]);

  // Click-outside-closes — the other half of matching aab's real close
  // behaviour: since a `wide` group no longer closes on hover-out at all,
  // it needs an explicit way to close short of navigating away or hovering
  // a different trigger. `pointerdown`, not `click`, so it fires before any
  // navigation a click on a link underneath would trigger.
  //
  // It used to need a second `[data-nav-subflyout]` clause: the sub-flyouts
  // were their own `Menu.Portal` under <body>, so a click on one read as an
  // outside click and slammed the panel shut before the link could navigate
  // (Tina, 2026-08-21: "when i try to click one of the subcatagories the
  // whole block just claps back up"). Both the flyouts and the clause went
  // 2026-08-22 — every row in a panel is now a plain link inside the header.
  useEffect(() => {
    if (navValue === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Element && !e.target.closest('header')) {
        closeAll();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [navValue]);

  // Neutralise Floating UI's "safe polygon" body lock for wide groups.
  // Found live 2026-08-21, the actual cause of two symptoms at once — Tina:
  // "when i try to click one of the subcatagories the whole block just
  // claps back up" AND, once the subflyout-portal fix above didn't fully
  // explain it, "and now it doesnt even close..." while debugging further.
  // Base UI's hover machinery (`floating-ui-react`'s `useHover`) sets
  // `document.body.style.pointerEvents = 'none'` while a hover-opened
  // floating element is open — a real, standard "safe polygon" technique so
  // a diagonal mouse path from trigger to popup can't accidentally hover
  // something else on the way. It expects the mouse to arrive inside the
  // floating content IT tracks (its own Positioner/Popup) to release the
  // lock. Our wide panel is deliberately NOT that tracked element (a plain
  // sibling div, for the positioning reasons in the wide-panel comment
  // below) — the mouse never "arrives" anywhere Base UI recognises, so the
  // lock never releases. With `pointer-events:none` on `<body>`, EVERY
  // click in the header (including on the wide panel's own links) resolves
  // to `<html>`, not the real target: the link's own click/navigation never
  // fires, and that phantom `<html>` target reads as "outside" to the
  // click-outside closer above, snapping the whole panel shut — exactly
  // "claps back up" with nothing happening. Confirmed live via
  // `document.elementsFromPoint`: a single-element stack, `<html>` only,
  // `pointer-events:auto` on itself but `body.style.cssText ===
  // "pointer-events: none"` underneath it.
  // A MutationObserver, not a one-time clear on open — Base UI can reassert
  // the lock on later hover events while navValue stays the same, so this
  // has to keep watching for as long as a wide group might be open, not
  // just fire once.
  useEffect(() => {
    if (!activeGroupIsWide) return;
    const clear = () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
    clear();
    const observer = new MutationObserver(clear);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => {
      observer.disconnect();
      clear();
    };
  }, [activeGroupIsWide]);

  // Close on scroll — Tina: "wehn i hover over it stayes like that its
  // supposed to close when i scroll down". Makes sense given the panel no
  // longer closes on hover-out at all (see above): once that safety net is
  // gone, scrolling the page is the other obvious signal that someone's
  // moved on, and for the `wide` panel specifically it's `position:absolute`
  // against the header's own row — scrolling would otherwise drag it along
  // rather than leave it sensibly anchored. `{ passive: true }` since
  // nothing here needs to block the actual scroll.
  useEffect(() => {
    if (navValue === null) return;
    const onScroll = () => closeAll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [navValue]);

  // Extracted so the SAME items grid can render two different ways: inside
  // Base UI's own floating Popup (compact groups, e.g. Hijabs) OR inside the
  // custom full-width panel below (wide groups, e.g. Clothing). Added
  // 2026-08-21 when the wide panel stopped being a floating card at all —
  // see the comment on `wideActive` further down for why.
  function renderItemsGrid(entry: NavGroup) {
    return (
      <div
        className={entry.wide ? 'grid gap-x-20' : 'grid gap-x-6'}
                // max-content, NOT minmax(0,1fr): the panel shrink-to-fits, and
                // minmax(0,…) lets a column shrink below its content width, which
                // made the whitespace-nowrap labels overlap. max-content sizes
                // each column to its widest label.
                style={
                  entry.flow === 'down'
                    ? {
                        // Explicit ROWS + column flow. Setting grid-template-columns
                        // would fill left-to-right and interleave the two lists;
                        // pinning the row count is what makes each column read
                        // straight down. gridAutoColumns must be max-content too,
                        // since the columns here are implicit tracks.
                        gridTemplateRows: `repeat(${Math.ceil(
                          entry.items.length / (entry.columns ?? 1)
                        )}, auto)`,
                        gridAutoFlow: 'column',
                        gridAutoColumns: 'max-content',
                      }
                    : { gridTemplateColumns: `repeat(${entry.columns ?? 1}, max-content)` }
                }
              >
                {(() => {
                  return entry.items.map((it, idx) => {
                  // The panel's first item is always an "All X" header link
                  // (Nav.tsx prepends one to every group) — bolded to match
                  // aab's own `w-bold` vs `w-medium` distinction, confirmed
                  // from their actual markup. NO divider between the two text
                  // columns — checked against a live Playwright render of
                  // their site 2026-08-21 (not just the screenshot, which
                  // read as if there were one): the vertical line in their
                  // panel separates the text block from their image tiles,
                  // which we don't have, so there's nothing for a divider to
                  // separate here. An earlier pass added one between the two
                  // text columns anyway, guessed from the screenshot alone —
                  // removed.
                  const itemStyle: CSSProperties = idx === 0 ? { fontWeight: 600 } : {};
                  return (
                    // Plain <Link>, NOT NavigationMenu.Link — this grid renders
                    // in TWO places (inside NavigationMenu.Content for compact
                    // groups, and inside the plain-CSS wide panel further down,
                    // which has no NavigationMenu.Root ancestor at all), and
                    // NavigationMenu.Link depends on that context. `data-active`
                    // below is our own explicit `path === it.href` check, not
                    // Base UI's internal tracking, so nothing is lost by not
                    // using it.
                    // .mega-row, NOT `block nav-link`. `.nav-link` is the
                    // horizontal-header class and sets `justify-content: center`
                    // (globals.css) — so every option in this panel rendered
                    // centred inside its column, and the two columns read as two
                    // ragged centred stacks rather than two lists. Tailwind
                    // cannot override it (`block`, `justify-start`, `text-left`
                    // all live in @layer utilities, and an unlayered rule beats
                    // any layered one), which is exactly why .mega-row (like
                    // .menu-row before it) sets its own text-align/justify.
                    // Same fix as the currency menu and the filter dropdowns.
                    <Link
                      key={it.href}
                      href={it.href}
                      className="mega-row"
                      style={itemStyle}
                      data-active={path === it.href}
                      onClick={closeAll}
                    >
                      <span className="mega-row-label">{it.label}</span>
                    </Link>
                  );
                  });
                })()}
      </div>
    );
  }

  // The currently-open WIDE group, if any — drives the custom full-width
  // panel below. Added 2026-08-21 (Tina, resending the same aab screenshot:
  // "im talking about the whole header not just the text... its a
  // extention of the WHOLE header" — the panel up to this point was still a
  // small floating rounded-corner card with a shadow, which reads as a
  // popover, not as the header itself growing taller). Base UI's
  // NavigationMenu.Popup is an ANCHORED, shrink-to-fit floating element by
  // design (it exists to position a small panel near its trigger) — fighting
  // that to make it a flush, full-bleed bar would mean overriding
  // floating-ui's own computed inline positioning with uncertain success.
  // Simpler and more certain: Clothing's actual visible panel is this plain
  // div instead, positioned in plain CSS against the header's own row (see
  // its `style` below) — Base UI still owns the Trigger's hover/keyboard
  // behaviour and `navValue`, this only replaces how the WIDE case is
  // drawn. Compact groups (Hijabs) keep the original floating Popup
  // further down, unchanged — a short single list reads fine as a small
  // dropdown; stretched to full width it would mostly be empty.
  const wideActive = items.find(
    (i): i is NavGroup => i.kind === 'group' && !!i.wide && i.label === navValue
  );

  return (
    <>
    <NavigationMenu.Root
      value={navValue}
      onValueChange={(value) => {
        // NO-HOVER DEVICES DRIVE THIS MENU BY TAP ALONE.
        //
        // Base UI's hover machinery still fires here on a touch screen,
        // because every `touchend` produces a full synthetic pointerleave /
        // mouseleave cascade as the touch pointer is destroyed. Traced on
        // production 2026-08-26 at 1366x1024 with touch: tapping a link inside
        // the open panel produced `pointerdown@SPAN`, `pointerup@SPAN`,
        // `touchend@SPAN` — all correctly on the link — and then
        // `click@BODY`. The panel was being pulled out from under the tap
        // between the finger lifting and the click landing, so the link's
        // navigation never fired.
        //
        // Ruled out first, rather than assumed: the panel was still open at
        // click time (it did not close until 222ms, the click was at 55ms);
        // `document.body.style.pointerEvents` was never `none`, so this was
        // NOT the Floating UI safe-polygon lock described further up; and an
        // ordinary header link and an ordinary footer link BOTH navigate
        // correctly on tap under the identical emulation, so it was not the
        // harness (§10.26 — suspected, then tested, then cleared).
        //
        // The Trigger's own onClick sets `navValue` directly, so vetoing here
        // costs a touch device nothing: tap-to-open, tap-to-close, tap-outside
        // and close-on-scroll all still work, and they are now the ONLY things
        // that move this state.
        if (window.matchMedia('(hover: none)').matches) return;
        if (value === null && pointerRelevant.current) return;
        if (value !== null && suppressReopen.current) return;
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
        {items.map((entry) =>
          entry.kind === 'link' ? (
            <NavigationMenu.Item key={entry.href} className="flex items-center">
              <NavigationMenu.Link
                render={<Link href={entry.href} />}
                className="nav-link"
                data-active={entry.activeWhen}
                // Found live 2026-08-21 (Tina: "when i stand on one of the
                // catagories without sub cataorie like editorial it doesnt
                // close the header") — a plain link (Designers/Editorial/
                // About) isn't a NavigationMenu.Trigger, so hovering it
                // never touches Base UI's own open/value tracking at all,
                // and the pointermove closer's `stillRelevant` check treats
                // anywhere inside `<header>` as fine (deliberately, so the
                // pointer can travel from a trigger down into its own
                // panel) — hovering an unrelated plain link never counted
                // as "left". A group's panel could sit open indefinitely
                // while the visitor's attention (and cursor) had moved on
                // to Editorial. `onPointerEnter` closes any open group the
                // moment the pointer actually reaches a plain link;
                // `onClick` is the same belt-and-suspenders as the
                // category links inside a panel already have, for the
                // click-without-a-preceding-hover case (keyboard, touch).
                onPointerEnter={closeAll}
                onClick={closeAll}
              >
                {entry.label}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          ) : (
          <NavigationMenu.Item
            key={entry.label}
            // Explicit `value`, not just `key` — without it Base UI
            // auto-generates an internal id for `navValue`/`onValueChange`,
            // which never equals `entry.label`. Found live 2026-08-21: the
            // wide panel's `wideActive` check (`i.label === navValue`)
            // silently never matched, so hovering "Clothing" opened nothing
            // but the now-empty old Popup, collapsed to a tiny padding-only
            // dot (Tina: "this is what i get").
            value={entry.label}
            className="relative flex items-center"
          >
            <NavigationMenu.Trigger
              className="nav-link group inline-flex items-center"
              data-active={entry.activeWhen}
              // Directory keeps its own page: rendering the trigger as a Link
              // preserves click-to-navigate, while hover and keyboard still open
              // the panel. Groups without an href stay buttons, which is what
              // makes them openable by tap.
              // Base UI assumes a Trigger renders a real <button> and warns in
              // dev when it does not; groups WITH an href render a <Link>, i.e.
              // an <a>, so it has to be told. Tied to the same `entry.href`
              // that decides the render prop, so the two can never disagree.
              nativeButton={!entry.href}
              render={entry.href ? <Link href={entry.href} /> : undefined}
              // Found live 2026-08-21 (Tina: "when you lcick of a catagory
              // it stays open even when youre on the new page") — clicking
              // a category LINK inside the panel already closed it
              // (`renderItemsGrid`'s own onClick), but clicking the
              // TRIGGER itself (e.g. the word "Clothing") navigates to
              // /directory via this same Link without ever touching that
              // code path, so the panel it was hovering open stayed open
              // on the destination page.
              // TOUCH FIRST, then the mouse case.
              //
              // On a device with no hover this trigger was COMPLETELY DEAD.
              // Measured on production 2026-08-26 at 1366x1024 with touch, in
              // both engines: tapping "Clothing" opened no panel AND did not
              // navigate — `panelsOpen: 0, navigated: false`. Every iPad-sized
              // touch device gets the desktop header (the mobile nav is
              // `lg:hidden`), so the entire Clothing / Hijabs / Basics menu was
              // unreachable there. Exactly §10.25, and the comment above about
              // `nativeButton` already said why: groups WITH an href render as
              // a Link and are hover-only, "groups without an href stay
              // buttons, which is what makes them openable by tap".
              //
              // Why it did not even navigate: this handler set
              // `suppressReopen`, which then vetoed the open that Base UI's
              // synthesised hover would otherwise have produced — so the tap
              // was absorbed and nothing at all happened.
              //
              // `matchMedia` is read AT CLICK TIME rather than cached in state
              // or a ref. §10.34 is the entry about this component and its
              // lesson is exactly that: a veto or override in here must be
              // driven by current live truth, never by a flag captured at some
              // earlier moment. A hybrid laptop can gain or lose a mouse
              // between renders; the only honest answer is the one at the
              // instant of the gesture.
              //
              // First tap OPENS. The panel's own first row is "All Clothing" ->
              // /directory, so the destination this Link points at is still one
              // tap away and nothing is lost; a second tap on the trigger
              // navigates, which is the behaviour a touch user expects from a
              // menu whose label is also a link.
              onClick={(event) => {
                if (window.matchMedia('(hover: none)').matches) {
                  if (navValue !== entry.label) {
                    event.preventDefault();
                    // Clear the veto FIRST — a previous tap may have set it,
                    // and it would otherwise swallow the open we are about to
                    // request through the very same `onValueChange` guard.
                    suppressReopen.current = false;
                    setNavValue(entry.label);
                    return;
                  }
                  // Already open: this is the second tap. Fall through to the
                  // Link's own navigation, closing on the way out.
                }
                // `closeAllAndSuppressReopen`, not plain `closeAll` — the
                // mouse is still sitting on this exact trigger after the
                // click (it didn't move), so Base UI's hover tracking
                // re-affirms "still hovering" and reopens it right back
                // through `onValueChange` the instant `closeAll` runs. See
                // that function's own comment for how this was confirmed.
                closeAllAndSuppressReopen();
              }}
            >
              {entry.label}
              <Chevron />
            </NavigationMenu.Trigger>

            {/* Empty for `wide` groups — their real content is the full-width
                panel below, not this floating Popup. Still present (rather
                than omitted) so every Trigger keeps a paired Content, which
                is what Base UI's hover/value/chevron-rotation bookkeeping
                expects. */}
            <NavigationMenu.Content
              className={
                'p-3 transition-[opacity,transform] duration-200 ease-out ' +
                'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 ' +
                'data-[starting-style]:-translate-y-1 data-[ending-style]:-translate-y-1'
              }
            >
              {!entry.wide && renderItemsGrid(entry)}
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          )
        )}
      </NavigationMenu.List>

      {/* Compact groups only (Hijabs) — Clothing's own Content is always
          empty, so this floating Popup never has visible content to show
          while it's the active group. */}
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          align="start"
          sideOffset={8}
          collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
          className="z-50 box-border h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-[250ms] ease-out data-[instant]:transition-none"
        >
          <NavigationMenu.Popup
            ref={outerPopupRef}
            className="relative h-[var(--popup-height)] w-[var(--popup-width)] origin-[var(--transform-origin)] overflow-hidden rounded-xl border transition-[opacity,transform,width,height] duration-200 ease-out data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            // Hidden while a wide group is active — its Content is always
            // empty (see above), but the Popup itself still renders its own
            // padding/border/radius around that empty box, which showed up
            // live as a small white dot floating under "Clothing" (Tina:
            // "this is what i get"). display:none removes it outright
            // rather than leaving an empty shell visible.
            style={{
              display: wideActive ? 'none' : undefined,
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

    {/* The wide panel itself — flush against the header, full width, no
        card chrome at all (no radius, no shadow, no gap), so it reads as
        the header bar continuing downward rather than a popover floating
        over the page. Positioned in plain CSS against the header's own row:
        this component renders inside Header.tsx's `relative` content row
        (Header.tsx -> that row -> a plain div -> <Nav/> -> here), and
        nothing between here and that row sets its own `position`, so
        `position:absolute` resolves against THAT row — which has no
        max-width cap of its own, so `left:0;right:0` is already genuinely
        edge-to-edge, matching the header's own full-bleed width for free.
        Hover-tracking needs no extra wiring: this div is real DOM inside
        the actual <header> element (not portalled), and the pointermove
        listener above already treats anything under `header` as relevant. */}
    {/* No border-bottom — checked against the live aab render (2026-08-21):
        the panel just ends, no hairline or shadow separating it from
        whatever's below. Matches the "one continuous surface" read better
        than the softer edge a border would give it.

        ONE always-mounted `<div>` PER wide group, stacked at the identical
        position, cross-fading via `opacity` — not a single conditionally
        mounted panel. A conditionally mounted version (Tina: "it closes so
        fucking ugly") can only ever fade IN: React removes the DOM node the
        instant `wideActive` goes null, so there is no "previous style" left
        for a CSS transition to animate FROM on the way out — a first cut
        tried to work around that with a second, delayed piece of state
        (keep the content mounted ~160ms past close) via React's documented
        "adjust state during render" pattern, and it silently didn't work:
        confirmed live via a temporary console.log that the state WAS being
        set correctly on every hover, yet the panel never actually
        rendered — something about this project's stricter compiler/lint
        setup (it already forbids reading refs during render, beyond what
        vanilla React allows) doesn't play well with that pattern here.
        Keeping every panel permanently in the DOM sidesteps the whole
        problem: `opacity` genuinely has something to transition FROM in
        both directions, no lagging state needed. `pointer-events` follows
        the same condition so a faded-out panel can't block clicks to
        whatever's underneath it, and `aria-hidden` keeps the inactive ones
        out of the accessibility tree. 150ms linear both ways, matching
        aab's own measured open transition (Playwright, 2026-08-21) —
        confirmed their close is at least AS fast (their panel goes fully
        display:none within ~20ms of switching triggers), so matching the
        open speed for both directions is a safe, honest read of "how it
        closes" from the one clean signal that was actually measurable. */}
    {items
      .filter((i): i is NavGroup => i.kind === 'group' && !!i.wide)
      .map((group) => {
        const isActive = navValue === group.label;
        return (
          <div
            key={group.label}
            // Two markers, deliberately different: `data-nav-wide-panel-group`
            // is on EVERY one of these divs, always, so the reduced-motion
            // rule in globals.css can reach a panel that's mid fade-OUT even
            // in the same render where it just lost `data-nav-wide-panel`
            // (below) — that one is conditional, present only on whichever
            // panel is currently active, matching what Playwright checks
            // elsewhere in this codebase's tests (`count()` of exactly 0 or 1).
            data-nav-wide-panel-group
            data-nav-wide-panel={isActive ? '' : undefined}
            aria-hidden={!isActive}
            className="absolute left-0 right-0 top-full z-40"
            style={{
              background: 'var(--parchment)',
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
              transition: 'opacity 150ms linear',
            }}
          >
            {/* pt-4, not py-10 on both sides (was py-10 all round — Tina,
                2026-08-22, sent a screenshot of the open Clothing panel:
                "there is a lot of space between the header and categories...
                user needs to go all the way down just to click one of the
                categories"). The 40px top pad put "All Clothing" a full
                40px+ below the header with nothing clickable in between;
                pb-10 stays, since that complaint was about the reach to the
                FIRST row, not the panel's overall height. */}
            <div className="px-4 lg:px-10 pt-4 pb-10">{renderItemsGrid(group)}</div>
          </div>
        );
      })}
    </>
  );
}
