import { describe, it, expect } from 'vitest';
import { STYLE_PIECES, type Piece } from './stylePieces';

/**
 * Style-It captions must not wrap.
 *
 * The slot's height budget assumes a caption of a known number of lines —
 * CAPTION_H in StyleIt.tsx, which the whole mix/dress column height is derived
 * from. A caption that wraps to an extra line silently makes one column taller
 * than the other. It is caused by nothing but a long label, so it is invisible
 * until someone looks at the page.
 *
 * "Hijab Boutique · Oversized Cotton Top" was 309px in a 262px row and did
 * exactly this; it is now "Oversized Top" at 244px.
 */

/** Marcellus advance widths per em, measured from the shipped face (see the
 *  --font-label token). Uppercase only: .eyebrow applies text-transform. */
const ADVANCE: Record<string, number> = {
  A: 0.678, B: 0.561, C: 0.677, D: 0.714, E: 0.49, F: 0.466, G: 0.742,
  H: 0.727, I: 0.265, J: 0.249, K: 0.646, L: 0.46, M: 1.018, N: 0.739,
  O: 0.806, P: 0.512, Q: 0.806, R: 0.591, S: 0.455, T: 0.597, U: 0.71,
  V: 0.658, W: 1.014, X: 0.698, Y: 0.621, Z: 0.642,
  '0': 0.806, '1': 0.295, '2': 0.532, '3': 0.504, '4': 0.573, '5': 0.466,
  '6': 0.558, '7': 0.489, '8': 0.538, '9': 0.554,
  ' ': 0.3, '·': 0.205, "'": 0.178, '-': 0.41, '&': 0.769, '.': 0.205,
};
const WIDEST = 1.018;      // 'M' — the fallback for anything not measured
const FONT_PX = 10;        // .eyebrow font-size
const TRACKING = 0.28 * FONT_PX;  // .eyebrow letter-spacing, added after each char

/** Arrow (34) + gap (12) either side of the frame. */
const CONTROLS = 2 * (34 + 12);
const MIX_ROW = 170 + CONTROLS;    // TOP_FRAME.w
const DRESS_ROW = 148 + CONTROLS;  // DRESS_FRAME.w

function widthPx(text: string): number {
  const upper = text.toUpperCase();
  let em = 0;
  for (const ch of upper) em += ADVANCE[ch] ?? WIDEST;
  return em * FONT_PX + TRACKING * upper.length;
}

const caption = (p: Piece) => (p.brand ? `${p.brand} · ${p.label}` : p.label);

describe('caption widths', () => {
  it('measures a known string close to the face itself', () => {
    // Guards the table: if these drift, every assertion below is fiction. The
    // reference figures come from measuring the .ttf directly, which applies
    // kerning; summing advances does not, so this runs ~1.5px high on a 30-char
    // string. Well inside the margin that matters, but it is why this is a
    // tolerance and not an equality.
    const near = (got: number, ref: number) => expect(Math.abs(got - ref)).toBeLessThan(3);
    near(widthPx('Hijab Boutique · Oversized Top'), 244);
    near(widthPx('Hijab Boutique · Oversized Cotton Top'), 309);
  });

  it.each([
    ['tops', STYLE_PIECES.tops],
    ['bottoms', STYLE_PIECES.bottoms],
  ])('every %s caption fits its row on one line', (_name, pieces) => {
    const over = pieces
      .map((p) => ({ text: caption(p), px: Math.round(widthPx(caption(p))) }))
      .filter((c) => c.px > MIX_ROW);
    expect(over, `wider than the ${MIX_ROW}px row — shorten the label`).toEqual([]);
  });

  it('every dress caption line fits — it is stacked, so each line is measured alone', () => {
    const over = STYLE_PIECES.dresses
      .flatMap((p) => [p.brand ?? '', p.label])
      .filter(Boolean)
      .map((line) => ({ line, px: Math.round(widthPx(line)) }))
      .filter((c) => c.px > DRESS_ROW);
    expect(over, `wider than the ${DRESS_ROW}px row — shorten the label`).toEqual([]);
  });
});
