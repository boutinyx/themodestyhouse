import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyPassword, createSessionCookie, clearSessionCookie, isValidSession, COOKIE_NAME } from './adminAuth';

function cookieValue(setCookie: string): string {
  return setCookie.split(';')[0].slice(`${COOKIE_NAME}=`.length);
}

describe('adminAuth', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-horse-battery-staple');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret-do-not-use-in-prod');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  describe('verifyPassword', () => {
    it('accepts the correct password', () => {
      expect(verifyPassword('correct-horse-battery-staple')).toBe(true);
    });
    it('rejects a wrong password', () => {
      expect(verifyPassword('wrong')).toBe(false);
    });
    it('rejects a wrong password of the same length', () => {
      expect(verifyPassword('correct-horse-battery-staplX')).toBe(false);
    });
    it('fails closed when ADMIN_PASSWORD is unset — never falls back to a default', () => {
      vi.stubEnv('ADMIN_PASSWORD', '');
      expect(verifyPassword('')).toBe(false);
      expect(verifyPassword('anything')).toBe(false);
    });
  });

  describe('session cookies', () => {
    it('round-trips: a freshly created cookie validates', () => {
      const token = cookieValue(createSessionCookie());
      expect(isValidSession(token)).toBe(true);
    });
    it('rejects an absent cookie', () => {
      expect(isValidSession(undefined)).toBe(false);
    });
    it('rejects a tampered payload (expiry pushed out without a valid signature)', () => {
      const token = cookieValue(createSessionCookie());
      const [v, , sig] = token.split('.');
      const tampered = `${v}.${Date.now() + 999_999_999}.${sig}`;
      expect(isValidSession(tampered)).toBe(false);
    });
    it('rejects a garbage cookie', () => {
      expect(isValidSession('not-a-real-token')).toBe(false);
    });
    it('rejects an expired session', () => {
      vi.useFakeTimers();
      const token = cookieValue(createSessionCookie());
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days > 7-day max age
      expect(isValidSession(token)).toBe(false);
    });
    it('a session signed under one secret is rejected under another', () => {
      const token = cookieValue(createSessionCookie());
      vi.stubEnv('ADMIN_SESSION_SECRET', 'a-different-secret');
      expect(isValidSession(token)).toBe(false);
    });
    it('clearSessionCookie sets Max-Age=0', () => {
      expect(clearSessionCookie()).toMatch(/Max-Age=0/);
    });
  });
});
