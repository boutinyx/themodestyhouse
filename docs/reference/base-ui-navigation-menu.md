# Reference — shadcn/ReUI Base UI NavigationMenu

**Stored 2026-08-07 so it never has to be pasted into a session again.**

This is the upstream component the header dropdowns are based on. It is a **reference only**:
nothing imports it, and it is deliberately kept as Markdown rather than a `.tsx` file, because
as written it does not compile in this repo (see below) and a broken file that nobody imports
would still fail `npm run typecheck` and `npm run lint`, and so CI.

## What we actually run

| Upstream | Ours |
|---|---|
| `navigation-menu-1.tsx` | [`components/NavMenu.tsx`](../../components/NavMenu.tsx) — header nav (Directory, Styles) |
| same primitives, `Menu` instead of `NavigationMenu` | [`components/CurrencySwitcher.tsx`](../../components/CurrencySwitcher.tsx) — currency picker |

Both use `@base-ui-components/react`, which **is** installed (`1.0.0-rc.0`). The Base UI
primitive is the valuable part — open/close, touch, keyboard, focus management, portalling
and collision-aware positioning — and that is what we took.

## Why it is not pasted in verbatim

This is not a shadcn project, and four things in the source do not exist here:

| Upstream needs | Status here |
|---|---|
| `cn` from `@/lib/utils` | **No `lib/utils.ts`** |
| `class-variance-authority` | **Not installed** |
| `lucide-react` | **Not installed** — the house icon set is `@phosphor-icons/react` |
| `bg-background`, `bg-accent`, `bg-popover`, `outline-border`, `text-muted-foreground`, `ring-ring` | **None defined.** Our tokens are `--aubergine`, `--parchment`, `--brass`, `--ink`, `--bone`, `--muted`, `--hairline` |

There is also no `components.json`, no `components/ui/`, and no Tailwind config — Tailwind v4
is CSS-first here.

**And a house rule:** every colour, border and shadow is an inline `style={{}}` with a
`var(--token)`; colour is never a Tailwind class. Every colour in the source below is a
Tailwind class, so pasting it in would introduce a second design system beside the real one.

## If we ever DO adopt shadcn properly

```bash
npx shadcn@latest init          # writes components.json + lib/utils.ts (cn)
npm i class-variance-authority clsx tailwind-merge lucide-react
```

Then add shadcn's token layer to `app/globals.css` (`--background`, `--foreground`, `--accent`,
`--accent-foreground`, `--popover`, `--border`, `--muted-foreground`, `--ring`) and put
generated primitives in `components/ui/`. That folder matters because `npx shadcn@latest add`
**writes and overwrites** files there — keeping generated code separate from hand-written
components is what stops an upgrade clobbering our work.

That is a real decision with lock-in, so it would want an ADR first.

---

## Source — `navigation-menu-1.tsx`

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui-components/react/navigation-menu';
import { cva } from 'class-variance-authority';
import { ChevronDownIcon } from 'lucide-react';

function NavigationMenu({ className, children, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn('group/navigation-menu relative flex max-w-max flex-1 items-center justify-center', className)}
      {...props}
    >
      {children}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn('group flex flex-1 list-none items-center justify-center gap-1', className)}
      {...props}
    />
  );
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn('relative', className)} {...props} />
  );
}

const navigationMenuTriggerStyle = cva(
  'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[popup-open]:hover:bg-accent data-[popup-open]:text-accent-foreground data-[popup-open]:focus:bg-accent data-[popup-open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1',
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      {...props}
    >
      {children}{' '}
      <ChevronDownIcon
        className="relative top-[1px] ms-1 size-3 transition duration-300 group-data-[popup-open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        'w-[calc(100vw_-_40px)] h-full p-2 sm:w-max xs:min-w-[400px] ',
        'transition-[opacity,transform,translate] duration-[var(--duration)] ease-[var(--easing)] ',
        'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 ',
        'data-[starting-style]:data-[activation-direction=left]:translate-x-[-50%] ',
        'data-[starting-style]:data-[activation-direction=right]:translate-x-[50%] ',
        'data-[ending-style]:data-[activation-direction=left]:translate-x-[50%] ',
        'data-[ending-style]:data-[activation-direction=right]:translate-x-[-50%]',
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuPortal({ ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Portal>) {
  return <NavigationMenuPrimitive.Portal data-slot="navigation-menu-portal" {...props} />;
}

function NavigationMenuPositioner({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Positioner>) {
  return (
    <NavigationMenuPortal>
      <NavigationMenuPrimitive.Positioner
        data-slot="navigation-menu-positioner"
        sideOffset={10}
        collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
        collisionAvoidance={{ side: 'none' }}
        className={cn(
          "box-border h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-[var(--duration)] ease-[var(--easing)] before:absolute before:content-[''] data-[instant]:transition-none data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 data-[side=bottom]:before:h-2.5 data-[side=left]:before:top-0 data-[side=left]:before:right-[-10px] data-[side=left]:before:bottom-0 data-[side=left]:before:w-2.5 data-[side=right]:before:top-0 data-[side=right]:before:bottom-0 data-[side=right]:before:left-[-10px] data-[side=right]:before:w-2.5 data-[side=top]:before:right-0 data-[side=top]:before:bottom-[-10px] data-[side=top]:before:left-0 data-[side=top]:before:h-2.5",
          className,
        )}
        style={
          {
            '--duration': '0.35s',
            '--easing': 'cubic-bezier(0.22, 1, 0.36, 1)',
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPortal>
  );
}

function NavigationMenuPopup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Popup>) {
  return (
    <NavigationMenuPrimitive.Popup
      className={cn(
        'data-[ending-style]:easing-[ease] relative h-[var(--popup-height)] origin-[var(--transform-origin)] rounded-lg bg-popover shadow-lg outline-1 outline-border transition-[opacity,transform,width,height,scale,translate] duration-[var(--duration)] ease-[var(--easing)] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 w-[var(--popup-width)] xs:w-[var(--popup-width)] dark:shadow-none dark:-outline-offset-1',
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Popup>
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <NavigationMenuPrimitive.Viewport className={cn('relative h-full w-full overflow-hidden', className)} {...props} />
  );
}

function NavigationMenuLink({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "data-[active]:focus:bg-accent data-[active]:hover:bg-accent data-[active]:bg-accent/50 data-[active]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuArrow({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Arrow>) {
  return (
    <NavigationMenuPrimitive.Arrow
      data-slot="navigation-menu-arrow"
      className={cn(
        'flex transition-[left] duration-[var(--duration)] ease-[var(--easing)] data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180',
        className,
      )}
      {...props}
    >
      <ArrowSvg />
    </NavigationMenuPrimitive.Arrow>
  );
}

function ArrowSvg(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-popover"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-border dark:fill-none"
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className="dark:fill-border"
      />
    </svg>
  );
}

export {
  NavigationMenu,
  NavigationMenuPortal,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuPositioner,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
  NavigationMenuPopup,
  NavigationMenuArrow,
};
```

## Source — `demo.tsx`

```tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu-1';
import { CircleCheckIcon, CircleHelpIcon, CircleIcon } from 'lucide-react';

const components: { title: string; href: string; description: string }[] = [
  {
    title: 'Alert Dialog',
    href: '/docs/primitives/alert-dialog',
    description: 'A modal dialog that interrupts the user with important content and expects a response.',
  },
  {
    title: 'Hover Card',
    href: '/docs/primitives/hover-card',
    description: 'For sighted users to preview content available behind a link.',
  },
  {
    title: 'Progress',
    href: '/docs/primitives/progress',
    description:
      'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.',
  },
  {
    title: 'Scroll-area',
    href: '/docs/primitives/scroll-area',
    description: 'Visually or semantically separates content.',
  },
  {
    title: 'Tabs',
    href: '/docs/primitives/tabs',
    description: 'A set of layered sections of content—known as tab panels—that are displayed one at a time.',
  },
  {
    title: 'Tooltip',
    href: '/docs/primitives/tooltip',
    description:
      'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.',
  },
];

export default function NavigationMenuDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Home</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink
                  render={
                    <Link
                      className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
                      href="/"
                    />
                  }
                >
                  <div className="mt-4 mb-2 text-lg font-medium">ReUI</div>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Beautifully designed components built with Tailwind CSS.
                  </p>
                </NavigationMenuLink>
              </li>
              <ListItem href="/docs" title="Introduction">
                Re-usable components built using Radix UI and Tailwind CSS.
              </ListItem>
              <ListItem href="/docs/installation" title="Installation">
                How to install dependencies and structure your app.
              </ListItem>
              <ListItem href="/docs/primitives/typography" title="Typography">
                Styles for headings, paragraphs, lists...etc
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              {components.map((component) => (
                <ListItem key={component.title} title={component.title} href={component.href}>
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink render={<Link href="/docs" className={navigationMenuTriggerStyle()} />}>
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>List</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-4">
              <li>
                <NavigationMenuLink render={<Link href="#" />}>
                  <div className="font-medium">Components</div>
                  <div className="text-muted-foreground">Browse all components in the library.</div>
                </NavigationMenuLink>
                <NavigationMenuLink render={<Link href="#" />}>
                  <div className="font-medium">Documentation</div>
                  <div className="text-muted-foreground">Learn how to use the library.</div>
                </NavigationMenuLink>
                <NavigationMenuLink render={<Link href="#" />}>
                  <div className="font-medium">Blog</div>
                  <div className="text-muted-foreground">Read our latest blog posts.</div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Simple</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-4">
              <li>
                <NavigationMenuLink render={<Link href="#" />}>Components</NavigationMenuLink>
                <NavigationMenuLink render={<Link href="#" />}>Documentation</NavigationMenuLink>
                <NavigationMenuLink render={<Link href="#" />}>Blocks</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>With Icon</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-4">
              <li>
                <NavigationMenuLink render={<Link href="#" className="flex-row items-center gap-2" />}>
                  <CircleHelpIcon />
                  Backlog
                </NavigationMenuLink>
                <NavigationMenuLink render={<Link href="#" className="flex-row items-center gap-2" />}>
                  <CircleIcon />
                  To Do
                </NavigationMenuLink>
                <NavigationMenuLink render={<Link href="#" className="flex-row items-center gap-2" />}>
                  <CircleCheckIcon />
                  Done
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>

      <NavigationMenuPositioner>
        <NavigationMenuPopup />
      </NavigationMenuPositioner>
    </NavigationMenu>
  );
}

function ListItem({ title, children, href, ...props }: React.ComponentPropsWithoutRef<'li'> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink render={<Link href={href} />}>
        <div className="text-sm leading-none font-medium">{title}</div>
        <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{children}</p>
      </NavigationMenuLink>
    </li>
  );
}
```
