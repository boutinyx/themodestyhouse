import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { getUnavailableProduct } from './unavailableProducts';

const file = path.join(process.cwd(), 'data', 'unavailable-products.json');

describe('unavailable-products.json (sold-out pages)', () => {
  it('never holds a product that is published — a live product must render its real page', () => {
    if (!existsSync(file)) return;
    const sold = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const published = new Set((JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8')) as { id: string }[]).map((p) => p.id));
    const overlap = Object.keys(sold).filter((id) => published.has(id));
    expect(overlap).toEqual([]);
  });

  it('never holds an editorially excluded brand', () => {
    if (!existsSync(file)) return;
    const sold = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const excl = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'exclusions.json'), 'utf8')) as { brands?: string[] };
    const blocked = new Set(excl.brands ?? []);
    expect(Object.keys(sold).filter((id) => blocked.has(id.split(':')[0]))).toEqual([]);
  });

  it('returns nothing for an id it does not know', () => {
    expect(getUnavailableProduct('no-such-brand:1')).toBeUndefined();
  });
});
