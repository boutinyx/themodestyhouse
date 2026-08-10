// '@phosphor-icons/react', not '/dist/ssr': this renders inside the footer's
// client component, and the client entry is what every other client file here
// imports (MobileNav, QuickView). CLAUDE.md §6 reserves /dist/ssr for server
// components.
import { Globe } from '@phosphor-icons/react';
import type { CurrencyPreference } from '@/lib/fx';

/**
 * A flag for each currency the switcher offers, drawn as inline SVG.
 *
 * WHY NOT EMOJI. 🇺🇸 / 🇬🇧 / 🇪🇺 are the obvious two-line version and they are
 * broken on Windows: no shipped Windows font carries regional-indicator pairs, so
 * Chrome and Firefox there render the letters "US", "GB", "EU" instead of a flag.
 * They are also unstyleable — size, radius and the hairline against the dark
 * footer are all decided by the platform's emoji font, not by us.
 *
 * WHY NOT PHOSPHOR. The house icon rule (CLAUDE.md §6) is that every ICON comes
 * from Phosphor; Phosphor has no flags, so there is nothing to break here. The
 * "as listed" option — which is not a country — DOES use Phosphor's Globe.
 *
 * Drawn at 18x12 (the 3:2 of the US and EU flags; the Union Flag's true 2:1 is
 * squeezed to match, which is what every flag-icon set does at this size). Detail
 * is deliberately reduced: the US canton carries six dots rather than fifty
 * stars, and the Union Flag's diagonals are centred rather than offset, because
 * at 18 CSS px neither difference is resolvable and both cost sharpness.
 */

const R = 3.2; // radius of the EU star ring, in viewBox units
const EU_STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return { cx: 9 + R * Math.sin(a), cy: 6 - R * Math.cos(a) };
});

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 18 12"
      width={18}
      height={12}
      role="img"
      aria-label={label}
      style={{
        display: 'block',
        flex: 'none',
        borderRadius: 2,
        // The flags are white-edged (US stripes, the Union Flag's saltire), so
        // without a rim they bleed into a light popup and float on the dark
        // footer. currentColor at 35% keeps the rim in whatever context it sits.
        boxShadow: '0 0 0 0.5px color-mix(in srgb, currentColor 35%, transparent)',
      }}
    >
      {children}
    </svg>
  );
}

function FlagUS() {
  return (
    <Frame label="United States">
      <rect width="18" height="12" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 12) / 13} width="18" height={12 / 13} fill="#b22234" />
      ))}
      <rect width="7.6" height={(7 * 12) / 13} fill="#3c3b6e" />
      {[
        [1.6, 1.4], [3.8, 1.4], [6.0, 1.4],
        [2.7, 3.2], [4.9, 3.2],
        [1.6, 5.0], [3.8, 5.0], [6.0, 5.0],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.5" fill="#fff" />
      ))}
    </Frame>
  );
}

function FlagGB() {
  return (
    <Frame label="United Kingdom">
      <rect width="18" height="12" fill="#012169" />
      {/* The root <svg> clips to its viewport, so the diagonals need no clipPath. */}
      <path d="M0 0 18 12 M18 0 0 12" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M0 0 18 12 M18 0 0 12" fill="none" stroke="#c8102e" strokeWidth="1.3" />
      <path d="M9 0V12 M0 6H18" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M9 0V12 M0 6H18" fill="none" stroke="#c8102e" strokeWidth="2.2" />
    </Frame>
  );
}

function FlagEU() {
  return (
    <Frame label="European Union">
      <rect width="18" height="12" fill="#003399" />
      {EU_STARS.map((s) => (
        <circle key={`${s.cx}-${s.cy}`} cx={s.cx} cy={s.cy} r="0.62" fill="#ffcc00" />
      ))}
    </Frame>
  );
}

/** `null` — "As listed" — is every brand's own currency, so it gets a globe
 *  rather than any one country's flag. */
export function CurrencyFlag({ currency }: { currency: CurrencyPreference }) {
  if (currency === 'USD') return <FlagUS />;
  if (currency === 'GBP') return <FlagGB />;
  if (currency === 'EUR') return <FlagEU />;
  return <Globe size={14} weight="regular" aria-hidden="true" style={{ display: 'block', flex: 'none' }} />;
}
