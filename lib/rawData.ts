import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Garment } from '@/lib/types';
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
const garmentOverridesFile = () => path.join(process.cwd(), 'data', 'garment-overrides.json');
const reviewFile = () => path.join(process.cwd(), 'data', 'review.json');
const photoReviewFile = () => path.join(process.cwd(), 'data', 'photo-review-decisions.json');
const exclusionsFile = () => path.join(process.cwd(), 'data', 'exclusions.json');

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

export function loadGarmentOverrides(): Record<string, Garment> {
  assertLocalDev();
  const f = garmentOverridesFile();
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8')) as Record<string, Garment>;
}

export function saveGarmentOverride(id: string, garment: Garment): void {
  assertLocalDev();
  const overrides = loadGarmentOverrides();
  overrides[id] = garment;
  writeFileSync(garmentOverridesFile(), JSON.stringify(overrides, null, 2));
}

export function loadReview(): unknown[] {
  assertLocalDev();
  const f = reviewFile();
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as unknown[];
}

/** Ids reviewed via /admin/photo-review and confirmed the photo is fine —
 *  stops a dismissed item from being re-surfaced on every publish. */
export function loadPhotoReviewDismissed(): Record<string, true> {
  assertLocalDev();
  const f = photoReviewFile();
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8')) as Record<string, true>;
}

export function dismissPhotoReview(id: string): void {
  assertLocalDev();
  const dismissed = loadPhotoReviewDismissed();
  dismissed[id] = true;
  writeFileSync(photoReviewFile(), JSON.stringify(dismissed, null, 2));
}

/** Permanently removes a product — used when a flagged photo turns out to
 *  actually be broken. Appends to exclusions.json's `ids` list, the same
 *  permanent mechanism as every other exclusion (Invariant 3) — never
 *  hand-edits products.json, never touches decisions.json. */
export function excludeProduct(id: string): void {
  assertLocalDev();
  const f = exclusionsFile();
  const excl = JSON.parse(readFileSync(f, 'utf8')) as { ids?: string[] };
  const ids = excl.ids ?? (excl.ids = []);
  if (!ids.includes(id)) ids.push(id);
  writeFileSync(f, JSON.stringify(excl, null, 2));
}
