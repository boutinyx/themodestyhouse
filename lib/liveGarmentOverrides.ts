import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { Garment } from '@/lib/types';

/**
 * Runtime-only garment corrections made from the inline staff edit controls
 * (docs/log/2026-08-12-inline-staff-editing.md), kept separate from the
 * git-tracked data/garment-overrides.json for the exact reason
 * lib/liveCuts.ts's data/.live-cuts.json is separate from decisions.json:
 * production has no GitHub credentials and no path to persist a write back
 * into git, so a move takes effect on the live site immediately (see the
 * override applied in lib/products.ts::getProducts()) and
 * scripts/merge-live-edits.mjs is the deliberate, reviewed step that folds
 * it into garment-overrides.json — the same file
 * lib/garmentReview.ts::resolveGarment already reads at publish time.
 *
 * Gitignored (see .gitignore) — never a build input, never bundled.
 */

export interface LiveGarmentOverrideEntry {
  garment: Garment;
  decidedAt: string; // ISO timestamp
}

export type LiveGarmentOverrides = Record<string, LiveGarmentOverrideEntry>;

const STORE_PATH = path.join(process.cwd(), 'data', '.live-garment-overrides.json');

export function getLiveGarmentOverrides(storePath: string = STORE_PATH): LiveGarmentOverrides {
  if (!existsSync(storePath)) return {};
  try {
    return JSON.parse(readFileSync(storePath, 'utf8')) as LiveGarmentOverrides;
  } catch {
    // A half-written file from a crashed process must never take the site
    // down — treat it as empty rather than throwing.
    return {};
  }
}

export function setLiveGarmentOverride(
  id: string,
  garment: Garment,
  storePath: string = STORE_PATH,
): LiveGarmentOverrides {
  const overrides = getLiveGarmentOverrides(storePath);
  overrides[id] = { garment, decidedAt: new Date().toISOString() };
  mkdirSync(path.dirname(storePath), { recursive: true });
  // Atomic write — same reasoning as lib/liveCuts.ts: a request reading
  // storePath mid-write always sees either the old complete file or the
  // new one, never a truncated one.
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(overrides, null, 2));
  renameSync(tmp, storePath);
  return overrides;
}

/** Wipes the store — for the "Clear list" staff action, once its contents
 *  have been merged into data/garment-overrides.json via
 *  scripts/merge-live-edits.mjs. Same atomic write as
 *  setLiveGarmentOverride, so a concurrent read never sees a truncated
 *  file. */
export function clearLiveGarmentOverrides(storePath: string = STORE_PATH): void {
  mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({}));
  renameSync(tmp, storePath);
}

export { STORE_PATH as LIVE_GARMENT_OVERRIDES_PATH };
