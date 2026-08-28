import { describe, it, expect } from 'vitest';
import { colourFamily, COLOUR_FAMILY_LABELS, COLOUR_FAMILY_SWATCH } from './colour';

describe('colourFamily', () => {
  it('reads a colour from the title suffix', () => {
    expect(colourFamily('Amara Maxi Dress - Sage Green')).toBe('green');
    expect(colourFamily('Tala premium Ribbed Knit Abaya- Espresso')).toBe('brown');
    expect(colourFamily('Aminah Zipper Jersey Dress - Cocoa Bean')).toBe('brown');
  });

  // The discriminating test for the suffix-first branch. Every other title in
  // this file resolves the same way through the full-title fallback, so
  // deleting the `if (split)` block leaves them all green. This one does not:
  // a real catalogue title whose body names one family and whose colourway
  // suffix names another. Without the branch it returns `yellow`, on `gold`.
  it('lets the suffix beat a colour word in the body of the title', () => {
    expect(colourFamily('Gold Accent Half Zip Abaya - Pistachio')).toBe('green');
  });

  it('reads a colour from elsewhere in the title', () => {
    expect(colourFamily('Chocolate Linen Cotton Wrap Top')).toBe('brown');
    expect(colourFamily('Black Abaya')).toBe('black');
  });

  // The two-word families must beat their own second word. Without an explicit
  // priority order "navy blue" (209 rows) resolves to blue and the Navy chip
  // is empty.
  it('prefers the more specific family', () => {
    expect(colourFamily('Hijab - Navy Blue')).toBe('navy');
    expect(colourFamily('Abaya - Light Brown')).toBe('brown');
    expect(colourFamily('Dress - Butter Yellow')).toBe('yellow');
    expect(colourFamily('Hijab - Dusty Rose')).toBe('pink');
    expect(colourFamily('Abaya - Claret Red')).toBe('red');
  });

  // A named colour beats a pattern word, so a black floral is filed black.
  // Only a garment with NO named colour falls through to multi.
  it('puts patterns in multi only when no colour is named', () => {
    expect(colourFamily('Leopard Print Hijab')).toBe('multi');
    expect(colourFamily('Black Floral Maxi Dress')).toBe('black');
  });

  // §10.31: `word()` is Unicode-aware, so an accented title still matches.
  it('matches across non-ASCII titles', () => {
    expect(colourFamily('Ombré Jersey Hijab')).toBe('multi');
    expect(colourFamily('Robe noire')).toBe('black');
  });

  // The negatives. Each of these is a real suffix string in the catalogue that
  // is NOT a colour, and each one would be a visible mistake in the grid.
  it('returns null for non-colour suffixes', () => {
    expect(colourFamily('Luxury Chiffon Hijab - Final Sale')).toBeNull();
    expect(colourFamily('Abaya - Limited Edition')).toBeNull();
    expect(colourFamily('Hijab - Smoked')).toBeNull();   // a finish, not a colour
    expect(colourFamily('Hijab - Natural')).toBeNull();
    expect(colourFamily('The Culture Starter Set')).toBeNull();
    expect(colourFamily('The Riella label')).toBeNull();
  });

  // Words that LOOK like beige and are deliberately absent from the vocabulary.
  // `linen` and `satin` are fabrics, not colours — "Linen Maxi Dress" is 1,100+
  // rows in the catalogue and none of them is beige by virtue of that.
  // `champagne` is a real shade name but is not in `beige`, so it is asserted
  // here rather than only claimed in prose.
  it('does not treat a fabric as a colour', () => {
    expect(colourFamily('Reyana Linen Maxi Dress')).toBeNull();
    expect(colourFamily('Satin top with lace detail')).toBeNull();
    expect(colourFamily('Chiffon Hijab - Champagne')).toBeNull();
  });

  // Substring safety, the §10.5/§10.10 family. Every one of these contains a
  // colour word as a substring and must not match.
  it('does not match a colour inside a longer word', () => {
    expect(colourFamily('Shredded Hem Jeans')).toBe('blue');   // via `jeans`->denim, NOT `red`
    expect(colourFamily('Standard Length Abaya')).toBeNull();  // not `tan`
    expect(colourFamily('Greenwich Trench')).toBeNull();       // not `green`
  });

  it('has a label and a swatch for every family', () => {
    for (const k of Object.keys(COLOUR_FAMILY_LABELS)) {
      expect(COLOUR_FAMILY_SWATCH[k as keyof typeof COLOUR_FAMILY_SWATCH]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
