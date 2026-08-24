/* ------------------------------------------------------------------ *
 * Which deployment am I?
 * ------------------------------------------------------------------ *
 *
 * Added 2026-08-24, when staging.themodestyhouse.com was stood up as a
 * second Railway service off the `staging` branch. Staging serves a
 * byte-identical build of the same catalogue from a public hostname, so
 * without a guard it is duplicate content competing with the real site in
 * Google's index — and worse, it is the copy that will occasionally be
 * broken, because that is what it is FOR.
 *
 * The signal is the REQUEST HOST, not an environment variable. That choice
 * is deliberate and it is the whole point of this file:
 *
 *   - An env var fails OPEN. Forget to set `IS_STAGING=1` when creating the
 *     staging service and staging is silently indexable, with nothing in the
 *     build output saying so. That is the §10.28 failure shape — a check
 *     whose "did not run" is indistinguishable from its "passed".
 *   - The host fails CLOSED. Anything that is not exactly the production
 *     hostname — staging, a *.up.railway.app default domain, a PR preview,
 *     localhost — is treated as non-production and gets a blanket noindex.
 *     A new deployment target is protected the moment it exists, before
 *     anyone remembers to configure it.
 *
 * The cost of the fail-closed direction is that pointing production at a NEW
 * hostname would de-index the real site until that hostname is added below.
 * That is a deliberate, loud, one-line failure, and it is the trade we want:
 * de-indexing the real site is instantly visible, an indexed staging clone is
 * not.
 *
 * `www.` never reaches this code — Cloudflare 301s it to the apex at the edge
 * (verified 2026-08-24: `curl -sI https://www.themodestyhouse.com/` -> 301,
 * `location: https://themodestyhouse.com/`, `server: cloudflare`) — but it is
 * listed anyway so that turning that redirect off cannot de-index the site.
 *
 * NOTE the mirror of this rule lives in `next.config.ts`, as a `missing: [{
 * type: 'host', value: ... }]` header rule that stamps `X-Robots-Tag:
 * noindex` on every response from any other host. That one runs at the edge
 * of the Next server on EVERY response including images and JSON; this one
 * shapes /robots.txt. Keep the two hostnames in step — `lib/deployEnv.test.ts`
 * asserts they are.
 */

/** Hostnames that serve the real, indexable site. Lowercase, no port. */
export const PRODUCTION_HOSTS = ['themodestyhouse.com', 'www.themodestyhouse.com'] as const;

/** The canonical origin. Every absolute URL we emit is built from this. */
export const PRODUCTION_ORIGIN = 'https://themodestyhouse.com';

/**
 * True only for the live site. Anything else — staging, a Railway default
 * domain, localhost, a missing Host header — is false.
 *
 * Takes the raw `Host` header, which may carry a port (`localhost:3000`) and
 * arbitrary casing (host names are case-insensitive per RFC 9110 §5.6.2).
 */
export function isProductionHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = host.trim().toLowerCase().split(':')[0];
  return (PRODUCTION_HOSTS as readonly string[]).includes(bare);
}
