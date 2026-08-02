import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';

export function loadRaw(): Product[] {
  const f = path.join(process.cwd(), 'data', 'raw-products.json');
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

export function loadDecisions(): Record<string, 'keep' | 'cut'> {
  const f = path.join(process.cwd(), 'data', 'decisions.json');
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8'));
}
