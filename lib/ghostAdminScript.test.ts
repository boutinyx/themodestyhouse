import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { adminToken } from '../scripts/lib/ghostAdmin.mjs';

const SECRET_HEX = '00112233445566778899aabbccddeeff';

describe('adminToken', () => {
  const token: string = adminToken(`abc123:${SECRET_HEX}`, 1_800_000_000);
  const [h, p, s] = token.split('.');

  it('names the key id and the admin audience, and expires within five minutes', () => {
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'HS256', typ: 'JWT', kid: 'abc123' });
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(claims.aud).toBe('/admin/');
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(300);
  });

  it('is signed with the HEX-DECODED secret, not the hex string', () => {
    const right = createHmac('sha256', Buffer.from(SECRET_HEX, 'hex')).update(`${h}.${p}`).digest('base64url');
    const wrong = createHmac('sha256', SECRET_HEX).update(`${h}.${p}`).digest('base64url');
    expect(s).toBe(right);
    expect(s).not.toBe(wrong);
  });

  it('rejects a malformed key', () => {
    expect(() => adminToken('nocolon')).toThrow(/<id>:<secret>/);
    expect(() => adminToken(undefined)).toThrow();
  });
});
