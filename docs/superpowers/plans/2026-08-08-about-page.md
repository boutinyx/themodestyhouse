# About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-sentence `/about` stub with six banded sections that explain the curation standard, publish computed catalogue figures, and surface the affiliate disclosure that currently only exists in `content/legal/terms.md`.

**Architecture:** A server-rendered page reading three integers from a new `lib/aboutStats.ts`. `lib/staticImage.ts` is generalised from one hardcoded folder to a dir-parameterised helper so a new `public/about/` image set gets hero-grade responsive widths. No client components, no state, no new global CSS.

**Tech Stack:** Next.js 16 App Router (server components) · React 19 · TypeScript strict · Tailwind v4 (layout only) · Vitest 4 · sharp (via `scripts/optimise-images.mjs`) · `@phosphor-icons/react/dist/ssr`

**Spec:** `docs/superpowers/specs/2026-08-08-about-page-design.md`

## Global Constraints

- **Tailwind for layout only.** Every colour, border and shadow is an inline `style={{}}` using `var(--token)`. Colour is never a Tailwind class in this repo.
- **Tokens:** `--aubergine:#441943` · `--plum:#6e4a6b` · `--parchment:#faf7f1` · `--brass:#a98a5b` (badges/graphic only, never buttons) · `--ink:#241b24` · `--bone:#fbfaf6` · `--muted:#8a7d6b` · `--hairline:#e4ddcf`
- **No new raw `<style>` block.** Only `VerifiedSpotlight`, `EditMagazine` and `MagnifierHero` may have them.
- **Every icon comes from Phosphor**, imported from `@phosphor-icons/react/dist/ssr` in server components. Never a text glyph (`♥ ♡ × → ←`).
- **Reuse the semantic classes** in `globals.css`: `.serif`, `.eyebrow`, `.section-heading`, `.btn-pill`, `.aubergine-band`.
- **Two mobile thresholds coexist:** hand-written CSS uses **820px**, Tailwind `md:` is **768px**. This page uses Tailwind `md:` unless matching an existing 820px band.
- **Raw `<img>` needs** `{/* eslint-disable-next-line @next/next/no-img-element */}` above it — the repo has zero `next/image` by decision.
- **Never assert exact catalogue counts in a test.** The nightly refresh moves them (§10.19). Assert relationships and types instead.
- **Never write user-facing marketing or brand copy** (§10.18). Band 2's mission note is Tina's to write; it ships as an empty constant.
- **Check the branch before committing** — this repo has concurrent sessions (§10.17). `git rev-parse --abbrev-ref HEAD`.
- **Commit only the files each task names.** Other sessions leave modified files in the tree; never `git add -A`.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/aboutStats.ts` (create) | Count houses / pieces / seals; format the rounded piece count. Pure, no JSX. |
| `lib/aboutStats.test.ts` (create) | Guards the counts as relationships, not literals. |
| `lib/staticImage.ts` (modify) | Generalised from `/editorial/` only to a dir-parameterised variant helper. |
| `lib/staticImage.test.ts` (modify) | Disk contract extended to cover `public/about/`. |
| `scripts/optimise-images.mjs` (modify) | New `about` job at hero widths. |
| `public/about/mashrabiya.jpg` (create) | Band 2 photograph, copied from `higgsfield-library/13-mashrabiya.jpg`. |
| `app/about/page.tsx` (rewrite) | The six bands. Presentation only. |
| `docs/log/2026-08-08-about-page.md` (create) | Work log entry. |

---

### Task 1: Catalogue figures

**Files:**
- Create: `lib/aboutStats.ts`
- Test: `lib/aboutStats.test.ts`

**Interfaces:**
- Consumes: `BRANDS` from `data/brands.ts`; `getProducts()` from `lib/products.ts`
- Produces: `type AboutStats = { houses: number; pieces: number; sealed: number }`, `aboutStats(): AboutStats`, `roundedPieces(n: number): string`

- [ ] **Step 1: Write the failing test**

Create `lib/aboutStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BRANDS } from '../data/brands';
import { aboutStats, roundedPieces } from './aboutStats';

/**
 * These assert RELATIONSHIPS, never literals. The nightly refresh moves the
 * product count — it went 11,125 -> 11,127 during the afternoon this was
 * designed — and a test pinned to a number would go red for a brand adding a
 * dress. That is the §10.19 mistake, and it is not worth repeating.
 */
describe('aboutStats', () => {
  const s = aboutStats();

  it('counts every brand in the catalogue', () => {
    expect(s.houses).toBe(BRANDS.length);
  });

  it('counts only the verified brands as sealed', () => {
    expect(s.sealed).toBe(BRANDS.filter((b) => b.badge === 'verified').length);
  });

  it('never claims more seals than houses', () => {
    expect(s.sealed).toBeLessThanOrEqual(s.houses);
  });

  it('returns whole positive numbers the page can print', () => {
    for (const n of [s.houses, s.pieces, s.sealed]) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe('roundedPieces', () => {
  it('rounds DOWN to the thousand so the figure never overstates', () => {
    expect(roundedPieces(11127)).toBe('11,000+');
    expect(roundedPieces(11999)).toBe('11,000+');
    expect(roundedPieces(12000)).toBe('12,000+');
  });

  it('prints small counts exactly rather than as "0+"', () => {
    expect(roundedPieces(999)).toBe('999');
    expect(roundedPieces(0)).toBe('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/aboutStats.test.ts`
Expected: FAIL — `Failed to resolve import "./aboutStats"`

- [ ] **Step 3: Write minimal implementation**

Create `lib/aboutStats.ts`:

```ts
/**
 * The three figures the About page's receipts band prints.
 *
 * Computed, never hardcoded. CLAUDE.md carried a hardcoded "~34 brands / ~5k
 * products" for months while the real numbers drifted to 59 and 11,127, and the
 * nightly refresh moved the product count again inside the afternoon this was
 * written. A number typed into a React file rots the same way.
 */
import { BRANDS } from '@/data/brands';
import { getProducts } from './products';

export type AboutStats = {
  /** Brands in the catalogue. */
  houses: number;
  /** Published products — everything the site serves. */
  pieces: number;
  /** Brands carrying the verified seal. */
  sealed: number;
};

export function aboutStats(): AboutStats {
  return {
    houses: BRANDS.length,
    pieces: getProducts().length,
    sealed: BRANDS.filter((b) => b.badge === 'verified').length,
  };
}

/**
 * '11,000+' — rounded DOWN, so the page can never overstate the catalogue, and
 * so the printed figure survives a nightly refresh that moves the exact count
 * by a handful. Counts under a thousand print exactly; '0+' would be absurd.
 */
export function roundedPieces(n: number): string {
  if (n < 1000) return String(n);
  return `${(Math.floor(n / 1000) * 1000).toLocaleString('en-US')}+`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/aboutStats.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD   # confirm before committing
git add lib/aboutStats.ts lib/aboutStats.test.ts
git commit -m "feat(about): compute the catalogue figures the receipts band prints"
```

---

### Task 2: Generalise the local-image helper

`lib/staticImage.ts` hardcodes `/editorial/`. Band 2 needs a second folder at larger widths. Generalise rather than copy-paste — the existing exported names stay, so no call site changes.

**Files:**
- Modify: `lib/staticImage.ts`
- Test: `lib/staticImage.test.ts`

**Interfaces:**
- Produces: `ABOUT_WIDTHS`, `aboutVariant(src, width)`, `aboutSrcSet(src, widths?)`
- Unchanged: `EDITORIAL_WIDTHS`, `editorialVariant`, `editorialSrcSet` keep their exact current behaviour

- [ ] **Step 1: Write the failing test**

Append to `lib/staticImage.test.ts`:

```ts
import { aboutVariant, aboutSrcSet, ABOUT_WIDTHS } from './staticImage';

describe('aboutVariant', () => {
  it('maps an about original to its width-suffixed webp', () => {
    expect(aboutVariant('/about/mashrabiya.jpg', 1440)).toBe('/about/mashrabiya-1440.webp');
  });

  it('does not cross folders', () => {
    // An editorial path is not an about path, and vice versa. Without this the
    // two helpers would silently emit variants that were never generated.
    expect(aboutVariant('/editorial/lookbook.jpg', 640)).toBeUndefined();
    expect(editorialVariant('/about/mashrabiya.jpg', 400)).toBeUndefined();
  });
});

describe('aboutSrcSet', () => {
  it('emits one candidate per hero-grade width', () => {
    expect(aboutSrcSet('/about/mashrabiya.jpg')).toBe(
      '/about/mashrabiya-640.webp 640w, /about/mashrabiya-1024.webp 1024w, ' +
        '/about/mashrabiya-1440.webp 1440w, /about/mashrabiya-1920.webp 1920w'
    );
  });

  it('carries the four widths the full-bleed band needs', () => {
    expect([...ABOUT_WIDTHS]).toEqual([640, 1024, 1440, 1920]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/staticImage.test.ts`
Expected: FAIL — `aboutVariant is not a function` (or an import resolution error)

- [ ] **Step 3: Write minimal implementation**

Replace the body of `lib/staticImage.ts` below its file comment with:

```ts
/** Widths written by scripts/optimise-images.mjs for the `editorial` job. */
export const EDITORIAL_WIDTHS = [400, 900] as const;

/**
 * Widths for the `about` job. Larger than editorial because band 2 of /about is
 * full-bleed: a 900px source on a 1440px display is visibly soft. Same set as
 * the homepage hero, which has the same job.
 */
export const ABOUT_WIDTHS = [640, 1024, 1440, 1920] as const;

type LocalDir = 'editorial' | 'about';

/**
 * The `-<width>.webp` variant for an original in `dir`, or undefined if `src`
 * is not one of ours. The regex is built per-dir so an editorial path can never
 * resolve to an about variant — the two folders have different generated
 * widths, so a cross-folder match would emit a URL that 404s.
 */
function variantIn(dir: LocalDir, src: string | undefined, width: number): string | undefined {
  const m = src?.match(new RegExp(`^/${dir}/([a-z0-9-]+)\\.jpe?g$`, 'i'));
  return m ? `/${dir}/${m[1]}-${width}.webp` : undefined;
}

function srcSetIn(dir: LocalDir, src: string | undefined, widths: readonly number[]): string | undefined {
  if (!variantIn(dir, src, widths[0])) return undefined;
  return widths.map((w) => `${variantIn(dir, src, w)} ${w}w`).join(', ');
}

/** The `-<width>.webp` variant path, or undefined if `src` is not one of ours. */
export function editorialVariant(src: string | undefined, width: number): string | undefined {
  return variantIn('editorial', src, width);
}

/**
 * A `srcset` for a local editorial image, or undefined for anything else —
 * a remote URL, an already-converted `.webp`, or a path in another folder.
 * Undefined is what React needs in order to omit the attribute entirely.
 */
export function editorialSrcSet(
  src: string | undefined,
  widths: readonly number[] = EDITORIAL_WIDTHS
): string | undefined {
  return srcSetIn('editorial', src, widths);
}

/** As `editorialVariant`, for the full-bleed photography in `public/about/`. */
export function aboutVariant(src: string | undefined, width: number): string | undefined {
  return variantIn('about', src, width);
}

/** As `editorialSrcSet`, for the full-bleed photography in `public/about/`. */
export function aboutSrcSet(
  src: string | undefined,
  widths: readonly number[] = ABOUT_WIDTHS
): string | undefined {
  return srcSetIn('about', src, widths);
}
```

- [ ] **Step 4: Run the full suite to verify nothing regressed**

Run: `npx vitest run lib/staticImage.test.ts`
Expected: PASS. The pre-existing editorial tests must still pass unchanged — that is the point of keeping the old names as wrappers.

Note: the `public/about/` disk-contract tests are added in Task 3, once the folder exists.

- [ ] **Step 5: Commit**

```bash
git add lib/staticImage.ts lib/staticImage.test.ts
git commit -m "refactor(images): parameterise the local-variant helper by folder"
```

---

### Task 3: The band 2 photograph and its variants

**Files:**
- Create: `public/about/mashrabiya.jpg` (copied from `higgsfield-library/13-mashrabiya.jpg`)
- Modify: `scripts/optimise-images.mjs:28-62` (the `JOBS` array)
- Modify: `lib/staticImage.test.ts` (extend the disk contract)

**Interfaces:**
- Consumes: `aboutVariant`, `ABOUT_WIDTHS` from Task 2
- Produces: `/about/mashrabiya.jpg` plus `-640/-1024/-1440/-1920.webp` on disk

- [ ] **Step 1: Place the original**

```bash
mkdir -p public/about
cp higgsfield-library/13-mashrabiya.jpg public/about/mashrabiya.jpg
```

The filename is new, not a replacement. Never overwrite a path under `public/` — Railway serves it with `max-age=14400` and Next does not fingerprint these paths, so new bytes at an old URL are invisible for four hours (§10.21).

- [ ] **Step 2: Add the job**

In `scripts/optimise-images.mjs`, append to the `JOBS` array (after the `hero-home.jpg` entry, before the closing `]`):

```js
  {
    // Full-bleed band on /about. Same job as the hero — it spans the viewport,
    // so the 900px editorial ceiling is visibly soft on a desktop display.
    dir: 'about',
    match: /\.jpe?g$/i,
    widths: [640, 1024, 1440, 1920],
    suffixWidth: true,
    opts: { quality: 78, effort: 5 },
  },
```

- [ ] **Step 3: Write the failing disk-contract test**

Append to `lib/staticImage.test.ts`:

```ts
/**
 * Same contract as the editorial block above: adding a photograph and
 * forgetting to run the script must fail here rather than 404 in a browser.
 */
describe('generated about variants exist on disk', () => {
  const dir = path.join(process.cwd(), 'public', 'about');
  const originals = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f));

  it('finds the originals it is meant to guard', () => {
    expect(originals.length).toBeGreaterThan(0);
  });

  for (const file of originals) {
    for (const w of ABOUT_WIDTHS) {
      it(`${file} has a ${w}px variant`, () => {
        const variant = aboutVariant(`/about/${file}`, w)!;
        expect(
          existsSync(path.join(process.cwd(), 'public', variant.replace(/^\//, ''))),
          `${variant} is missing — run: node scripts/optimise-images.mjs`
        ).toBe(true);
      });
    }
  }
});
```

- [ ] **Step 4: Run it and watch it fail for the right reason**

Run: `npx vitest run lib/staticImage.test.ts`
Expected: FAIL — four tests, each `/about/mashrabiya-<w>.webp is missing — run: node scripts/optimise-images.mjs`

Failing here first is the point: it proves the guard actually detects a missing variant, rather than passing vacuously.

- [ ] **Step 5: Generate the variants**

Run: `node scripts/optimise-images.mjs`
Expected: an `about` section in the output listing `mashrabiya` at four widths, with before/after KB.

- [ ] **Step 6: Verify the tests now pass**

Run: `npx vitest run lib/staticImage.test.ts`
Expected: PASS, including the four new variant tests.

- [ ] **Step 7: Commit**

```bash
git add public/about scripts/optimise-images.mjs lib/staticImage.test.ts
git commit -m "feat(about): add the mashrabiya band photograph at hero widths"
```

---

### Task 4: The page

**Files:**
- Rewrite: `app/about/page.tsx`

**Interfaces:**
- Consumes: `aboutStats()`, `roundedPieces()` (Task 1); `aboutSrcSet()` (Task 2); `/about/mashrabiya.jpg` (Task 3)

**Band 2 is Tina's copy slot.** `MISSION` ships as `''` and the text block renders only when it is non-empty, so an unfilled slot degrades to a clean image band rather than an empty box. Do not fill it with invented copy (§10.18).

Band 1's stance reuses the two sentences already live on the stub — existing approved copy, not newly authored voice.

- [ ] **Step 1: Write the page**

Replace `app/about/page.tsx` entirely:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { SealCheck, Prohibit, Sparkle, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { aboutStats, roundedPieces } from '@/lib/aboutStats';
import { aboutSrcSet } from '@/lib/staticImage';

export const metadata: Metadata = {
  title: 'About | The Modesty House',
  description:
    'A curated index of modest fashion — how houses are chosen, what the seal means, and how the site is paid for.',
};

/**
 * COPY SLOT — Tina writes this. ~120 words, first person plural, why the site
 * exists. Leave it empty rather than inventing brand voice (§10.18); the band
 * renders as image-only until it is filled.
 */
const MISSION = '';

const BAND = 'px-5 md:px-8 py-16 md:py-24';
const INNER = 'max-w-[1220px] mx-auto';

export default function AboutPage() {
  const { houses, pieces, sealed } = aboutStats();

  const figures = [
    { value: String(houses), label: 'houses indexed' },
    { value: roundedPieces(pieces), label: 'pieces catalogued' },
    { value: String(sealed), label: 'carrying the seal' },
  ];

  return (
    <main>
      {/* 1 — STATEMENT */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={`${INNER} max-w-3xl text-center pt-16`}>
          <div className="eyebrow">About</div>
          <h1 className="section-heading mt-3" style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, color: 'var(--ink)' }}>
            The archive for everything modest
          </h1>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            The Modesty House is a curated index of modest fashion — brand by brand, piece by
            piece. A curator, not a catalogue: we frame the fashion and point you to where
            it&rsquo;s sold.
          </p>
        </div>
      </section>

      {/* 2 — WHY THIS EXISTS. Full-bleed photograph.
          The composition puts the lattice hard left and leaves the right half
          empty plum, so from md up the note sits INSIDE the image. Below that it
          stacks — text over a busy gold lattice at 393px is unreadable. */}
      <section>
        <div className="relative md:min-h-[560px]" style={{ background: 'var(--aubergine)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about/mashrabiya-1440.webp"
            srcSet={aboutSrcSet('/about/mashrabiya.jpg')}
            sizes="100vw"
            alt="A carved mashrabiya screen casting patterned light on a plum wall"
            className="w-full h-64 object-cover md:absolute md:inset-0 md:h-full"
            decoding="async"
            loading="lazy"
          />
          {/* Scrim only from md up, where text overlays the photograph. It
              darkens the right half so parchment type clears AA against the
              lattice highlights. */}
          <div
            className="hidden md:block md:absolute md:inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(37,10,36,0) 30%, rgba(37,10,36,0.55) 55%, rgba(37,10,36,0.78) 100%)',
            }}
          />
          {MISSION ? (
            <div className={`relative ${INNER} px-5 md:px-8 py-12 md:py-24 md:min-h-[560px] md:flex md:items-center md:justify-end`}>
              <div className="md:w-1/2">
                <div className="eyebrow" style={{ color: 'var(--brass)' }}>
                  Why this exists
                </div>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--parchment)' }}>
                  {MISSION}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 3 — RECEIPTS */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={`${INNER} grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 text-center`}>
          {figures.map((f) => (
            <div key={f.label}>
              <div className="serif" style={{ fontSize: 'clamp(38px,6vw,60px)', lineHeight: 1, color: 'var(--parchment)' }}>
                {f.value}
              </div>
              <div className="eyebrow mt-3" style={{ color: 'var(--brass)' }}>
                {f.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — THE STANDARD */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={INNER}>
          <div className="eyebrow">The standard</div>
          <h2 className="section-heading mt-3" style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}>
            What gets in
          </h2>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <ul className="space-y-4">
                {[
                  'Independent houses that design their own clothes.',
                  'Pieces we would put in front of someone whose taste we respect.',
                  'Stock a shopper can actually buy today, checked on every refresh.',
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                    <Sparkle size={16} weight="fill" style={{ color: 'var(--brass)', flexShrink: 0, marginTop: 3 }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <ul className="space-y-4">
                {[
                  'Women’s clothing only.',
                  'Clothing only — no perfume, bakhoor, candles or gift sets.',
                  'No mass-market or budget labels.',
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                    <Prohibit size={16} weight="bold" style={{ color: 'var(--plum)', flexShrink: 0, marginTop: 3 }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The seal, and its limits. The negative clause is load-bearing:
              without it the page implies a guarantee the site cannot honour. */}
          <div
            className="mt-12 p-6 md:p-8"
            style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 8 }}
          >
            <div className="flex gap-3 items-center">
              <SealCheck size={20} weight="fill" style={{ color: 'var(--brass)' }} />
              <div className="eyebrow" style={{ color: 'var(--ink)' }}>
                What the seal means
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              A seal is a judgement about craft and design — that we have looked at the clothes
              and think they are well made and well designed.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              It is not a promise about shipping, service or returns. Those are between you and
              the house, on the house&rsquo;s own site, under its own terms.
            </p>
            <Link href="/designers" className="nav-link inline-flex items-center gap-1.5 mt-6">
              See the houses <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5 — HOW THIS IS PAID FOR */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={`${INNER} max-w-3xl`}>
          <div className="eyebrow">Disclosure</div>
          <h2 className="section-heading mt-3" style={{ fontSize: 'clamp(24px,3.5vw,34px)', lineHeight: 1.1, color: 'var(--ink)' }}>
            How this is paid for
          </h2>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            Some links on this site are affiliate links. If you click one and buy something, we
            may earn a small commission — at no extra cost to you. It is what funds the site.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            Commission never influences whether a house earns the seal, and it never changes the
            price you pay. We are not a shop: you buy from the house, on its own site.
          </p>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            The full detail is in our{' '}
            <Link href="/terms" style={{ color: 'var(--plum)', textDecoration: 'underline' }}>
              terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" style={{ color: 'var(--plum)', textDecoration: 'underline' }}>
              privacy policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 6 — CLOSE */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={`${INNER} text-center`}>
          <h2 className="section-heading" style={{ fontSize: 'clamp(24px,3.5vw,36px)', lineHeight: 1.1, color: 'var(--parchment)' }}>
            Start with the directory
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/directory" className="btn-pill inline-block" style={{ background: 'var(--parchment)', color: 'var(--ink)' }}>
              Browse the directory
            </Link>
            <Link href="/contact?topic=seal" className="btn-pill inline-block" style={{ background: 'var(--brass)', color: 'var(--ink)' }}>
              Apply for the seal
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
rm -f tsconfig.tsbuildinfo
npx tsc --noEmit
```
Expected: exit 0, no output. `incremental: true` can mask a repeat run, hence the `rm`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 4: Build the route**

Run: `npm run build`
Expected: success, and `/about` listed in the route table as a static (prerendered) route.

- [ ] **Step 5: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat(about): six banded sections replacing the two-sentence stub"
```

---

### Task 5: Prove it on a phone and against axe

The audit is a gate, and it is blind to overlap and to anything below the fold unless you look at the full-page render (§10.22). Both checks happen here.

**Files:**
- Modify: `app/about/page.tsx` (only if a check fails)

- [ ] **Step 1: Start the dev server if it is not already up**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/about
```
Expected: `200`. If not, run `npm run dev` in the background first.

- [ ] **Step 2: Run the mobile audit**

Run: `npm run audit:mobile`
Expected: 0 overflow, 0 axe violations, 0 undersized tap targets — matching the clean baseline of 2026-08-07. Any new violation on `/about` is this task's regression.

- [ ] **Step 3: Measure band 2's contrast rather than assuming it**

The scrim exists to make parchment type clear AA over the lattice. Prove it:

```bash
node -e "
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext(devices['iPhone 15 Pro'])).newPage();
  await p.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const d = document.documentElement;
    return { overflow: d.scrollWidth > innerWidth, scrollW: d.scrollWidth, vw: innerWidth };
  });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: '.audit/about-iphone-full.png', fullPage: true });
  await b.close();
})();
"
```
Expected: `{"overflow":false,...}` and a full-page screenshot written.

- [ ] **Step 4: Look at the screenshot**

Read `.audit/about-iphone-full.png` and check by eye: no overlapping text, band 2's image is the mashrabiya and not a broken box, the three figures read cleanly stacked, both CTAs are legible on aubergine. A blank or broken frame is a failure regardless of what the audit said.

- [ ] **Step 5: Repeat at desktop width**

Same script with `viewport: { width: 1440, height: 900 }` and no device profile. Confirm band 2's note (once `MISSION` is filled) sits in the right half over the darkened area, not over the lattice.

- [ ] **Step 6: Commit any fixes**

```bash
git add app/about/page.tsx
git commit -m "fix(about): <what the audit or the render actually showed>"
```

If nothing failed, skip the commit — do not invent a change to have something to commit.

---

### Task 6: Log the work

**Files:**
- Create: `docs/log/2026-08-08-about-page.md`

- [ ] **Step 1: Write the entry**

Use the §9 format exactly:

```markdown
# About page — six banded sections replacing the stub
**Date:** 2026-08-08 · **Status:** partial

## Goal
## What changed
## Verification
## Notes / follow-ups
```

Under **Verification**, paste the real output of `npm test`, `npx tsc --noEmit`,
`npm run lint` and `npm run audit:mobile` — evidence, not claims. If a command
failed, say so.

Status is **partial**, not done: band 2's `MISSION` slot is empty until Tina
writes it. Say that explicitly under follow-ups, along with the note that the
page must not be considered launch-ready with an empty band 2.

- [ ] **Step 2: Commit**

```bash
git add docs/log/2026-08-08-about-page.md
git commit -m "docs(about): log the About page build"
```

---

## Self-review

**Spec coverage** — every section of the spec maps to a task:

| Spec requirement | Task |
|---|---|
| `lib/aboutStats.ts`, three integers, rounding in presentation | 1 |
| Payload discipline (no arrays into the render) | 1, 4 |
| Image plumbing: new job, extended helper, variants on disk | 2, 3 |
| Six bands, house voice, copy slots | 4 |
| Band 4 edges stated in full + the seal's negative clause | 4 |
| Band 5 hedged disclosure + seal-independence + links | 4 |
| `metadata.description` drops "The Tina Aesthetic" | 4 |
| Band 2 stacks below the md breakpoint | 4 |
| Contrast measured, not assumed | 5 |
| Full-page render read by eye | 5 |
| Work log | 6 |

**Placeholders** — the only intentional blank is `MISSION = ''`, which is a product decision recorded in the spec, not an unwritten step. Every code step carries its complete code.

**Type consistency** — `aboutStats()` returns `{ houses, pieces, sealed }` in Task 1 and is destructured with those exact names in Task 4. `aboutSrcSet(src)` is defined in Task 2 and called with one argument in Task 4, relying on the `ABOUT_WIDTHS` default. `ABOUT_WIDTHS` is asserted as `[640, 1024, 1440, 1920]` in Task 2 and matches the job widths added in Task 3.

**Known deviation from the spec:** the spec says band 2 stacks below **820px**; the plan implements the stack at Tailwind's **768px** `md:` breakpoint. Both thresholds exist in this codebase (§6) and the page uses no hand-written CSS, so `md:` is the consistent choice. Flagged rather than silently reconciled.
