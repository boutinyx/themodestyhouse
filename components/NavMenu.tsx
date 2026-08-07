'use client';
import Link from 'next/link';
import { NavigationMenu } from '@base-ui-components/react/navigation-menu';

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

export type NavItem = { href: string; label: string };

function Chevron() {
  return (
    <svg
      width="9"
      height="6"
      viewBox="0 0 9 6"
      fill="none"
      aria-hidden="true"
      className="ms-1.5 transition-transform duration-200 group-data-[popup-open]:rotate-180"
    >
      <path d="M1 1L4.5 4.5L8 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
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
  return (
    <NavigationMenu.Root
      // `flex items-center` rather than a plain block. As a block, the inline-flex
      // children sat in a LINE BOX whose leading pushed the menu items 0.75px
      // below the plain links beside them (measured: top 47.75 vs 47.00). A flex
      // container has no line box, so every nav item shares one vertical centre.
      className="relative flex items-center"
    >
      <NavigationMenu.List className="flex items-center gap-5 md:gap-7 list-none m-0 p-0">
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
                {g.items.map((it) => (
                  <NavigationMenu.Link
                    key={it.href}
                    render={<Link href={it.href} />}
                    className="block nav-link py-2 px-3 whitespace-nowrap rounded-lg"
                    data-active={path === it.href}
                  >
                    {it.label}
                  </NavigationMenu.Link>
                ))}
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
