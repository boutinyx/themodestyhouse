import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { DressSubtype } from '@/lib/types';

/**
 * Runtime-only Everyday / Occasion / Slip assignments made from the inline
 * staff pencil, added 2026-08-27 at Tina's request.
 *
 * Same shape and reasoning as lib/liveCuts.ts / lib/liveGarmentOverrides.ts /
 * lib/liveLaneOverrides.ts: production has no path to write back into git, so a
 * change takes effect immediately here (applied by lib/products.ts::getProducts)
 * and scripts/merge-live-edits.mjs is the deliberate, reviewed step that folds it
 * into data/dress-subtypes.json.
 *
 * WHY THIS ONE MATTERS MORE THAN THE OTHER THREE. The layering, outerwear and
 * hijab sub-categories all have a classifier underneath them — a staff override
 * corrects a machine's guess. DressSubtype has none (lib/specialty.ts's
 * dressSubtype() reads `curatedDressSubtype`, then one brand rule, then gives
 * up), so this store is not a correction layer, it is the ONLY way the value is
 * ever produced. Until now the only route to one was Tina sending a batch of
 * URLs for someone to hand-merge; that is what the dress-subtypes log meant by
 * "there is no staff UI for this yet".
 *
 * Gitignored (see .gitignore) — never a build input, never bundled.
 */

export interface LiveDressTypeEntry {
  subtype: DressSubtype;
  decidedAt: string; // ISO timestamp
}

export type LiveDressTypes = Record<string, LiveDressTypeEntry>;

const STORE_PATH = path.join(process.cwd(), 'data', '.live-dress-types.json');

export function getLiveDressTypes(storePath: string = STORE_PATH): LiveDressTypes {
  if (!existsSync(storePath)) return {};
  try {
    return JSON.parse(readFileSync(storePath, 'utf8')) as LiveDressTypes;
  } catch {
    // A half-written file from a crashed process must never take the site
    // down — treat it as empty rather than throwing.
    return {};
  }
}

export function setLiveDressType(
  id: string,
  subtype: DressSubtype,
  storePath: string = STORE_PATH,
): LiveDressTypes {
  const types = getLiveDressTypes(storePath);
  types[id] = { subtype, decidedAt: new Date().toISOString() };
  mkdirSync(path.dirname(storePath), { recursive: true });
  // Atomic write — a request reading storePath mid-write always sees either
  // the old complete file or the new one, never a truncated one.
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(types, null, 2));
  renameSync(tmp, storePath);
  return types;
}

/** Wipes the store — for the "Clear list" staff action, once its contents have
 *  been merged into data/dress-subtypes.json via scripts/merge-live-edits.mjs. */
export function clearLiveDressTypes(storePath: string = STORE_PATH): void {
  mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({}));
  renameSync(tmp, storePath);
}

export { STORE_PATH as LIVE_DRESS_TYPES_PATH };
