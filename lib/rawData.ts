import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';
import { assertLocalDev } from '@/lib/devOnly';

/**
 * LAYER 4 — data layer for the local-only curation tool.
 *
 * Every entry point asserts the local-dev sentinel, so no future route, Server
 * Function or component can reach this data in a deployment even if the build
 * gate and the proxy are both misconfigured.
 *
 * NOTE: this is a chokepoint for the *app*, not for the repo. The pipeline
 * scripts (scripts/build-data.mjs, scripts/refresh.mjs, scripts/add-brands.mjs)
 * read and write data/decisions.json with their own fs calls and do not import
 * this module. That is fine — they only ever run locally — but do not describe
 * this file as "the only way to touch decisions.json".
 */

export type Decision = 'keep' | 'cut';

const rawFile = () => path.join(process.cwd(), 'data', 'raw-products.json');
const decisionsFile = () => path.join(process.cwd(), 'data', 'decisions.json');

export function loadRaw(): Product[] {
  assertLocalDev();
  const f = rawFile();
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

export function loadDecisions(): Record<string, Decision> {
  assertLocalDev();
  const f = decisionsFile();
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8')) as Record<string, Decision>;
}

export function saveDecision(id: string, decision: Decision): void {
  assertLocalDev();
  const decisions = loadDecisions();
  decisions[id] = decision;
  writeFileSync(decisionsFile(), JSON.stringify(decisions, null, 2));
}
