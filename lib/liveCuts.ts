import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

/**
 * Runtime-only curation overrides made from the live /staff/curate admin
 * (docs/log/2026-08-12-staff-curate.md), kept DELIBERATELY separate from the
 * git-tracked data/decisions.json.
 *
 * Why separate: this file is written by the production container while it is
 * running. Railway containers are rebuilt from the git image on every
 * deploy, so anything written here has no path back into git on its own —
 * writing straight into decisions.json would either need production to hold
 * GitHub write credentials (a real secret, a bigger blast radius if the
 * shared admin password ever leaks) or would silently vanish on the next
 * deploy with no record it ever existed. Tina's call, 2026-08-12: cuts save
 * here immediately (so they take effect on the live site right away — see
 * the isCut() filter wired into lib/products.ts), and `scripts/
 * merge-live-cuts.mjs` is the deliberate, reviewed step that folds them into
 * decisions.json so they survive a redeploy and reach the normal pipeline.
 *
 * Gitignored (see .gitignore) — never a build input, never bundled.
 */

export interface LiveCutEntry {
  decision: 'keep' | 'cut';
  decidedAt: string; // ISO timestamp
}

export type LiveCuts = Record<string, LiveCutEntry>;

const STORE_PATH = path.join(process.cwd(), 'data', '.live-cuts.json');

export function getLiveCuts(storePath: string = STORE_PATH): LiveCuts {
  if (!existsSync(storePath)) return {};
  try {
    return JSON.parse(readFileSync(storePath, 'utf8')) as LiveCuts;
  } catch {
    // A half-written file from a crashed process must never take the site
    // down — treat it as empty rather than throwing.
    return {};
  }
}

export function setLiveCut(
  id: string,
  decision: 'keep' | 'cut',
  storePath: string = STORE_PATH,
): LiveCuts {
  const cuts = getLiveCuts(storePath);
  cuts[id] = { decision, decidedAt: new Date().toISOString() };
  mkdirSync(path.dirname(storePath), { recursive: true });
  // Write to a temp file in the same directory, then rename — rename is
  // atomic on POSIX filesystems, so a request reading storePath mid-write
  // always sees either the old complete file or the new one, never a
  // truncated one (this path is read on every product-listing request once
  // wired into lib/products.ts).
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(cuts, null, 2));
  renameSync(tmp, storePath);
  return cuts;
}

/** Wipes the store — for the "Clear list" staff action, once its contents
 *  have been merged into data/decisions.json via scripts/merge-live-edits.mjs.
 *  Same atomic write as setLiveCut, so a concurrent read never sees a
 *  truncated file. */
export function clearLiveCuts(storePath: string = STORE_PATH): void {
  mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({}));
  renameSync(tmp, storePath);
}

/** The set of product ids currently hidden from the public site. */
export function getCutIds(storePath: string = STORE_PATH): Set<string> {
  const cuts = getLiveCuts(storePath);
  return new Set(Object.entries(cuts).filter(([, v]) => v.decision === 'cut').map(([id]) => id));
}

export { STORE_PATH as LIVE_CUTS_PATH };
