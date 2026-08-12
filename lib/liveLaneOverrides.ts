import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { ForcedLane, LayeringSubtype } from '@/lib/types';

/**
 * Runtime-only lane corrections made from the inline staff edit controls
 * (docs/log/2026-08-12-lane-overrides.md), for the two specialty lanes
 * (Modest Activewear, Layering Basics) not reachable through a garment
 * override — see lib/specialty.ts. Same shape and reasoning as
 * lib/liveCuts.ts / lib/liveGarmentOverrides.ts: production has no path to
 * write back into git, so a move takes effect immediately here (applied by
 * lib/products.ts::getProducts()) and scripts/merge-live-edits.mjs is the
 * deliberate, reviewed step that folds it into data/lane-overrides.json.
 *
 * Gitignored (see .gitignore) — never a build input, never bundled.
 */

export interface LiveLaneOverrideEntry {
  lane: ForcedLane;
  subtype?: LayeringSubtype;
  decidedAt: string; // ISO timestamp
}

export type LiveLaneOverrides = Record<string, LiveLaneOverrideEntry>;

const STORE_PATH = path.join(process.cwd(), 'data', '.live-lane-overrides.json');

export function getLiveLaneOverrides(storePath: string = STORE_PATH): LiveLaneOverrides {
  if (!existsSync(storePath)) return {};
  try {
    return JSON.parse(readFileSync(storePath, 'utf8')) as LiveLaneOverrides;
  } catch {
    // A half-written file from a crashed process must never take the site
    // down — treat it as empty rather than throwing.
    return {};
  }
}

export function setLiveLaneOverride(
  id: string,
  lane: ForcedLane,
  subtype: LayeringSubtype | undefined,
  storePath: string = STORE_PATH,
): LiveLaneOverrides {
  const overrides = getLiveLaneOverrides(storePath);
  overrides[id] = subtype
    ? { lane, subtype, decidedAt: new Date().toISOString() }
    : { lane, decidedAt: new Date().toISOString() };
  mkdirSync(path.dirname(storePath), { recursive: true });
  // Atomic write — same reasoning as lib/liveCuts.ts: a request reading
  // storePath mid-write always sees either the old complete file or the
  // new one, never a truncated one.
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(overrides, null, 2));
  renameSync(tmp, storePath);
  return overrides;
}

export { STORE_PATH as LIVE_LANE_OVERRIDES_PATH };
