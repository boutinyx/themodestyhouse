import { describe, it, expect } from 'vitest';
import { isProductionHost, PRODUCTION_HOSTS, PRODUCTION_ORIGIN } from './deployEnv';
import { SITE_URL } from './schema';
import nextConfig from '../next.config';

describe('isProductionHost', () => {
  it('accepts the live hostnames', () => {
    expect(isProductionHost('themodestyhouse.com')).toBe(true);
    expect(isProductionHost('www.themodestyhouse.com')).toBe(true);
  });

  // Host names are case-insensitive (RFC 9110 5.6.2) and may carry a port.
  it('normalises case and port', () => {
    expect(isProductionHost('TheModestyHouse.com')).toBe(true);
    expect(isProductionHost('themodestyhouse.com:443')).toBe(true);
  });

  it('rejects every non-production host', () => {
    expect(isProductionHost('staging.themodestyhouse.com')).toBe(false);
    expect(isProductionHost('themodestyhouse-staging.up.railway.app')).toBe(false);
    expect(isProductionHost('localhost:3000')).toBe(false);
    expect(isProductionHost(null)).toBe(false);
    expect(isProductionHost('')).toBe(false);
  });

  // The check is an exact match on the bare host, not a substring: a
  // substring test would accept an attacker-controlled themodestyhouse.com.evil.com
  // and reject nothing useful. Same family as the \b lesson in CLAUDE.md 10.5.
  it('is not a substring match', () => {
    expect(isProductionHost('themodestyhouse.com.evil.com')).toBe(false);
    expect(isProductionHost('notthemodestyhouse.com')).toBe(false);
  });
});

describe('the two halves of the staging noindex guard stay in step', () => {
  // lib/deployEnv.ts claims next.config.ts mirrors its host list. Asserting it
  // here is the difference between a claim in a comment and a fact: nothing
  // else would fail if someone added a production hostname to one and not the
  // other, and the symptom would be a silently de-indexed live site.
  it('next.config.ts noindexes exactly the hosts deployEnv does not trust', async () => {
    const headers = await nextConfig('phase-production-build').headers!();
    const rule = headers.find((r) =>
      r.headers.some((h) => h.key === 'X-Robots-Tag' && h.value.includes('noarchive')),
    );

    expect(rule, 'no blanket X-Robots-Tag rule found in next.config.ts').toBeDefined();
    expect(rule!.source).toBe('/(.*)');
    expect(rule!.missing).toEqual(
      PRODUCTION_HOSTS.map((value) => ({ type: 'host', value })),
    );
  });

  it('the canonical origin used by schema.org output is a production host', () => {
    expect(SITE_URL).toBe(PRODUCTION_ORIGIN);
    expect(isProductionHost(new URL(PRODUCTION_ORIGIN).host)).toBe(true);
  });
});
