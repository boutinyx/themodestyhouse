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

/** Added 2026-08-12 for CAD/AUD/DKK/TRY/SAR/BSD (Tina's currency-expansion
 *  request, driven by the site's real visitor-country breakdown). Same
 *  reduced-detail approach as the original three: a maple leaf's eleven
 *  points become eight, the Southern Cross's mix of 5- and 7-pointed stars
 *  become five same-size dots, and Saudi Arabia's script + sword — the one
 *  flag in this set built from calligraphy, unreadable at any icon size —
 *  becomes a plain field with a thin bar standing in for the sword, which is
 *  the standard treatment minimal flag-icon sets use for it. */
function FlagCA() {
  return (
    <Frame label="Canada">
      <rect width="18" height="12" fill="#fff" />
      <rect width="4.5" height="12" fill="#d80621" />
      <rect x="13.5" width="4.5" height="12" fill="#d80621" />
      <path
        d="M9 2.2 9.5 3.7 11 3.1 10.35 4.5 11.8 4.9 10.45 5.7 11.2 7.1 9.65 6.65 9.8 8.3 9 7.35 8.2 8.3 8.35 6.65 6.8 7.1 7.55 5.7 6.2 4.9 7.65 4.5 7 3.1 8.5 3.7Z M9 7.35V9.6"
        fill="#d80621"
        stroke="#d80621"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function FlagAU() {
  const CROSS = [
    [13, 3.1, 0.62],
    [15.2, 5, 0.5],
    [14.1, 7.6, 0.5],
    [11.6, 6.4, 0.42],
    [12.6, 8.7, 0.36],
  ] as const;
  return (
    <Frame label="Australia">
      <rect width="18" height="12" fill="#00247d" />
      {/* Union Jack canton, confined to the top-left quadrant. */}
      <rect width="9" height="6" fill="#00247d" />
      <path d="M0 0 9 6 M9 0 0 6" stroke="#fff" strokeWidth="1.3" />
      <path d="M0 0 9 6 M9 0 0 6" stroke="#c8102e" strokeWidth="0.65" />
      <path d="M4.5 0V6 M0 3H9" stroke="#fff" strokeWidth="2" />
      <path d="M4.5 0V6 M0 3H9" stroke="#c8102e" strokeWidth="1.1" />
      {/* Commonwealth Star, hoist side below the canton. */}
      <circle cx="2.3" cy="9" r="0.68" fill="#fff" />
      {/* Southern Cross, fly side. */}
      {CROSS.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#fff" />
      ))}
    </Frame>
  );
}

function FlagDK() {
  return (
    <Frame label="Denmark">
      <rect width="18" height="12" fill="#c8102e" />
      <rect x="6" width="2" height="12" fill="#fff" />
      <rect y="5" width="18" height="2" fill="#fff" />
    </Frame>
  );
}

function FlagTR() {
  return (
    <Frame label="Türkiye">
      <rect width="18" height="12" fill="#e30a17" />
      <circle cx="7" cy="6" r="3" fill="#fff" />
      <circle cx="7.9" cy="6" r="2.4" fill="#e30a17" />
      <path
        d="M11 4.6 11.55 6.3 10.1 5.25H11.9L10.45 6.3Z"
        fill="#fff"
      />
    </Frame>
  );
}

function FlagSA() {
  return (
    <Frame label="Saudi Arabia">
      <rect width="18" height="12" fill="#006c35" />
      <rect x="2" y="9.3" width="14" height="0.8" fill="#fff" />
    </Frame>
  );
}

function FlagBS() {
  return (
    <Frame label="Bahamas">
      <rect width="18" height="4" fill="#00abc9" />
      <rect y="4" width="18" height="4" fill="#ffc61e" />
      <rect y="8" width="18" height="4" fill="#00abc9" />
      <path d="M0 0 9 6 0 12Z" fill="#000" />
    </Frame>
  );
}

/** `null` — "As listed" — is every brand's own currency, so it gets a globe
 *  rather than any one country's flag. */
export function CurrencyFlag({ currency }: { currency: CurrencyPreference }) {
  if (currency === 'USD') return <FlagUS />;
  if (currency === 'GBP') return <FlagGB />;
  if (currency === 'EUR') return <FlagEU />;
  if (currency === 'CAD') return <FlagCA />;
  if (currency === 'AUD') return <FlagAU />;
  if (currency === 'DKK') return <FlagDK />;
  if (currency === 'TRY') return <FlagTR />;
  if (currency === 'SAR') return <FlagSA />;
  if (currency === 'BSD') return <FlagBS />;
  return <Globe size={14} weight="regular" aria-hidden="true" style={{ display: 'block', flex: 'none' }} />;
}
