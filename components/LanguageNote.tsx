'use client';

import { Popover } from '@base-ui-components/react/popover';
import { Info } from '@phosphor-icons/react';

/**
 * The small "i" in the corner of every product grid, answering the one question
 * Tina gets about clicking through to a brand: why the brand's own product page
 * is sometimes not in English.
 *
 * A sibling of the currency footnote in CurrencySwitcher / FooterCurrency — same
 * shape of promise, that something on the BRAND's side differs from what the
 * directory showed, said before the click rather than discovered after it.
 *
 * Built on Base UI's Popover rather than a hover tooltip, deliberately. A
 * hover-only disclosure is unreachable on every touch device (§10.25), and a
 * hand-rolled one is unreachable in a subtler way — a tap fires a full
 * hover-EXIT cascade that dismantles the panel between the finger lifting and
 * the click landing (§10.45), and `(hover: none)` cannot tell a tablet with a
 * trackpad apart from a finger on that same tablet (§10.50). Popover opens on
 * click/tap in every configuration, which is the only behaviour that is correct
 * on all of them. This is the fourth use of a Base UI primitive here rather
 * than a fourth hand-rolled panel.
 */
export function LanguageNote() {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Why are some product pages in another language?"
        className="fixed z-40 flex items-center justify-center rounded-full"
        style={{
          right: 'max(16px, env(safe-area-inset-right))',
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          width: 36,
          height: 36,
          background: 'var(--bone)',
          color: 'var(--plum)',
          border: '1px solid var(--hairline)',
          boxShadow: '0 1px 6px rgba(36,27,36,0.10)',
          cursor: 'pointer',
        }}
      >
        <Info size={18} weight="regular" />
      </Popover.Trigger>
      <Popover.Portal>
        {/* The z-index belongs on the POSITIONER, not the popup. ProductCard's
            whole-card anchor is `absolute inset-0 z-10`, and an explicit
            z-index beats `auto` regardless of DOM order — so without this the
            portalled panel renders BEHIND every card it overlaps. That is not
            merely cosmetic: the card's link then swallows taps meant for the
            note and sends the reader out to a brand's site. Caught by probing
            elementFromPoint over the panel (§10.36), not by geometry — the
            panel was on-screen, correctly sized and fully populated the whole
            time (§10.22). */}
        <Popover.Positioner side="top" align="end" sideOffset={8} style={{ zIndex: 60 }}>
          <Popover.Popup
            className="rounded-md"
            style={{
              maxWidth: 280,
              padding: '14px 16px',
              background: 'var(--bone)',
              border: '1px solid var(--hairline)',
              boxShadow: '0 6px 24px rgba(36,27,36,0.14)',
              // The panel is anchored to a fixed trigger in the viewport corner,
              // so on a narrow phone it must still be able to shrink rather than
              // run off the left edge.
              width: 'min(280px, calc(100vw - 32px))',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-label), serif',
                fontSize: 14,
                lineHeight: 1.35,
                color: 'var(--ink)',
                marginBottom: 8,
              }}
            >
              Why are some product pages in another language?
            </p>
            <p
              style={{
                fontFamily: 'var(--font-ui-stack)',
                fontSize: 12.5,
                lineHeight: 1.55,
                color: 'var(--muted)',
              }}
            >
              Some brands only publish in their own language. Most still ship to your
              country &mdash; check at checkout.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
