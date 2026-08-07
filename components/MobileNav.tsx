'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List as ListIcon } from '@phosphor-icons/react';
import { Menu } from '@base-ui-components/react/menu';
import { VIBES } from '@/lib/vibes';
import { CATEGORY_LANES } from '@/lib/lanes';

/**
 * The phone navigation.
 *
 * It replaces a horizontally-scrolling row that sat OUTSIDE the white header
 * pill, directly on the hero photograph. Measured at iPhone 13 width: 485px of
 * content in a 358px box, with "Editorial" and "About" entirely off-screen
 * (right edges at 410px and 481px against a 390px viewport). Muted type on a
 * busy photograph, with two of five items unreachable unless you happened to
 * swipe a row that gave no sign it scrolled.
 *
 * Built on the same Base UI Menu as the currency control, so it portals (no
 * clipping), traps focus, closes on Escape and on outside click, and supports
 * keyboard navigation without any of that being hand-rolled.
 */
export function MobileNav() {
  const path = usePathname();
  const item = 'block w-full nav-link py-3 px-3 whitespace-nowrap cursor-pointer';

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Open navigation"
        className="nav-link inline-flex items-center justify-center leading-none"
        style={{ fontSize: 13, letterSpacing: 0 }}
      >
        <ListIcon size={20} style={{ display: 'block' }} />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          sideOffset={12}
          align="end"
          collisionPadding={{ left: 16, right: 16 }}
          className="z-50"
        >
          <Menu.Popup
            className="rounded-xl border p-2 origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            style={{
              background: '#fff',
              borderColor: 'var(--hairline)',
              boxShadow: '0 8px 30px rgba(43,38,34,0.14)',
              // Wide enough to read as a panel rather than a dropdown, but still
              // inside the collision padding on the narrowest phones.
              width: 'min(280px, calc(100vw - 40px))',
              maxHeight: 'calc(100vh - 140px)',
              overflowY: 'auto',
            }}
          >
            <Menu.Item className={item} closeOnClick render={<Link href="/directory" />} data-active={path === '/directory'}>
              Products
            </Menu.Item>
            {CATEGORY_LANES.map((l) => (
              <Menu.Item
                key={l.slug}
                className={`${item} pl-6`}
                closeOnClick
                render={<Link href={`/${l.slug}`} />}
                data-active={path === `/${l.slug}`}
                style={{ fontSize: 11 }}
              >
                {l.title}
              </Menu.Item>
            ))}

            <Menu.Separator style={{ height: 1, background: 'var(--hairline)', margin: '6px 0' }} />

            {VIBES.map((v) => (
              <Menu.Item
                key={v.slug}
                className={`${item} pl-6`}
                closeOnClick
                render={<Link href={`/style/${v.slug}`} />}
                data-active={path === `/style/${v.slug}`}
                style={{ fontSize: 11 }}
              >
                {v.title}
              </Menu.Item>
            ))}

            <Menu.Separator style={{ height: 1, background: 'var(--hairline)', margin: '6px 0' }} />

            {[
              { href: '/designers', label: 'Designers' },
              { href: '/editorial', label: 'Editorial' },
              { href: '/about', label: 'About' },
            ].map((l) => (
              <Menu.Item
                key={l.href}
                className={item}
                closeOnClick
                render={<Link href={l.href} />}
                data-active={path.startsWith(l.href)}
              >
                {l.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
