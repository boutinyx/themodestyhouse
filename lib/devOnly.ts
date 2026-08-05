import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Guards for the local-only curation tooling (/admin/curate, /api/curate*).
 *
 * These are deliberately TWO INDEPENDENT predicates, not one predicate reused.
 * An earlier design keyed every layer off `process.env.NODE_ENV`, which meant a
 * single build-time env var (`NODE_ENV=development` on the deploy platform)
 * flipped all layers at once. See lib/devOnly.test.ts.
 *
 *   IS_LOCAL_DEV   -> NODE_ENV based. Constant-folded by Next at build time.
 *   assertLocalDev -> filesystem-sentinel based. Cannot be set by any env var.
 */

/**
 * Marker env vars set by managed hosting platforms. Presence of ANY of these
 * means "not a developer laptop", regardless of what NODE_ENV claims.
 *
 * This is the layer that survives the specific misconfiguration of deploying
 * with NODE_ENV=development. We host on RAILWAY — an earlier version of this
 * file only checked VERCEL, which meant that on Railway the NODE_ENV mistake
 * had no backstop at this layer at all. Add a marker whenever the host changes.
 */
const PLATFORM_MARKERS = [
  'RAILWAY_ENVIRONMENT', 'RAILWAY_PROJECT_ID', 'RAILWAY_SERVICE_ID', // Railway (current host)
  'VERCEL',                                                          // Vercel
  'RENDER', 'FLY_APP_NAME', 'DYNO', 'AWS_EXECUTION_ENV', 'K_SERVICE', // others
] as const;

/** Takes a plain record rather than NodeJS.ProcessEnv so tests can pass a
 *  minimal fixture without having to satisfy the full ProcessEnv type. */
export function onManagedPlatform(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return PLATFORM_MARKERS.some((k) => Boolean(env[k]));
}

/**
 * True only under `next dev` on a developer machine.
 *
 * Next replaces `process.env.NODE_ENV` with a string literal at build time, so
 * in a production build this folds to `false` and the guarded branches are
 * dropped by the optimiser. It cannot be re-enabled by setting an environment
 * variable on an already-deployed server.
 *
 * Fails CLOSED: production, preview, `next start` and unset NODE_ENV are false.
 */
export const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' && !onManagedPlatform();

/**
 * A DEDICATED gitignored marker, created by the `predev` npm script. It is
 * physically absent from every deployment artifact, so its presence is proof of
 * a local working copy — and unlike NODE_ENV, nothing in a deploy config can
 * fake it.
 *
 * WHY A DEDICATED FILE. This was `data/raw-products.json` until 2026-08-05, on
 * the reasoning that raw was gitignored and therefore never deployed. That
 * reasoning was correct but fragile: it made a SECURITY property depend on a
 * DATA file's storage decision. Committing raw — which the refresh workflow
 * needs, and which closes P0-B — would have put the sentinel into production and
 * silently stopped this layer throwing, with every test still green.
 *
 * The sentinel must therefore be a file with no reason to exist other than being
 * the sentinel. `lib/devOnly.test.ts` now asserts this path is gitignored, so
 * the substitution cannot happen silently again.
 */
export const LOCAL_ONLY_SENTINEL = path.join(
  process.cwd(),
  'data',
  '.local-only',
);

/** Pure and injectable so the guard itself is unit-testable. */
export function sentinelPresent(sentinel: string = LOCAL_ONLY_SENTINEL): boolean {
  return existsSync(sentinel);
}

/**
 * Guard for data-layer functions. Throws rather than returning a response, so
 * it is safe to call from anywhere (route handler, Server Function, script).
 *
 * Independent of NODE_ENV on purpose — this is the layer that still holds if
 * someone manages to build with NODE_ENV=development.
 */
export function assertLocalDev(sentinel: string = LOCAL_ONLY_SENTINEL): void {
  if (!sentinelPresent(sentinel)) {
    throw new Error('Not available');
  }
}

/**
 * Guard for route handlers. Returns a bare 404 (indistinguishable from a route
 * that does not exist) when not in local dev, otherwise null.
 *
 *   const blocked = devOnlyResponse();
 *   if (blocked) return blocked;
 */
export function devOnlyResponse(): Response | null {
  return IS_LOCAL_DEV ? null : new Response(null, { status: 404 });
}
