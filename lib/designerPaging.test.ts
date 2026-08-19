import { describe, it, expect } from 'vitest';
import { designerPageCount, clampDesignerPage } from './designerPaging';

describe('designerPageCount', () => {
  it('divides items into pages, rounding up', () => {
    expect(designerPageCount(113, 30)).toBe(4);
    expect(designerPageCount(120, 30)).toBe(4);
    expect(designerPageCount(121, 30)).toBe(5);
  });
  it('never returns less than 1, even for an empty index', () => {
    expect(designerPageCount(0, 30)).toBe(1);
  });
  it('degrades safely on nonsense input rather than returning 0 or NaN', () => {
    expect(designerPageCount(NaN, 30)).toBe(1);
    expect(designerPageCount(113, 0)).toBe(1);
  });
});

describe('clampDesignerPage', () => {
  const PAGES = 4;
  it('defaults to page 1 when absent or unparseable', () => {
    expect(clampDesignerPage(undefined, PAGES)).toBe(1);
    expect(clampDesignerPage('abc', PAGES)).toBe(1);
  });
  it('passes through pages inside the range', () => {
    expect(clampDesignerPage('2', PAGES)).toBe(2);
    expect(clampDesignerPage('4', PAGES)).toBe(4);
  });

  // THE REGRESSION. Each of these previously produced a canonical echoing the
  // requested integer while serving page 4's content.
  it('clamps an over-range page down to the last real page', () => {
    expect(clampDesignerPage('99', PAGES)).toBe(4);
    expect(clampDesignerPage('5', PAGES)).toBe(4);
  });
  it('clamps exponential notation, which Number() reports as finite', () => {
    expect(Number.isFinite(Number('1e9'))).toBe(true); // the reason a plain isFinite guard was not enough
    expect(clampDesignerPage('1e9', PAGES)).toBe(4);
  });
  it('clamps zero and negatives up to 1', () => {
    expect(clampDesignerPage('0', PAGES)).toBe(1);
    expect(clampDesignerPage('-3', PAGES)).toBe(1);
  });
  it('truncates fractions rather than rounding', () => {
    expect(clampDesignerPage('2.9', PAGES)).toBe(2);
  });
});
