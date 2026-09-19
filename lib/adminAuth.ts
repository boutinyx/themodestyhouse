import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Session handling for the live staff admin (/staff/curate — see
 * docs/log/2026-08-12-staff-curate.md). Deliberately hand-rolled rather than
 * a library: this is a single shared password gating one page, the same
 * scale as the rest of this codebase's auth-adjacent code (lib/devOnly.ts).
 *
 * Stateless signed cookie, not a server-side session store — a Railway
 * container restart or redeploy must not silently log everyone out, and a
 * signature the server can verify without remembering anything it issued is
 * the simplest way to get that for free.
 */

const COOKIE_NAME = 'staff_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET is not set');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/**
 * Constant-time string compare. `timingSafeEqual` itself requires equal-length
 * buffers and throws otherwise — which is a length leak — so both inputs are
 * first hashed to a fixed-length digest and only the digests are compared.
 */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHmac('sha256', 'len-normalize').update(a).digest();
  const hashB = createHmac('sha256', 'len-normalize').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function verifyPassword(candidate: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false; // fail closed if unset, never fall back to a default
  return safeEqual(candidate, real);
}

/** Builds the Set-Cookie value for a fresh session, valid for SESSION_MAX_AGE_MS. */
export function createSessionCookie(): string {
  const expires = Date.now() + SESSION_MAX_AGE_MS;
  const payload = `v1.${expires}`;
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV !== 'development' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/${secure}; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV !== 'development' ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/${secure}; Max-Age=0`;
}

/** True only for a cookie value this server signed, that has not expired. */
export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return false;
  const [v, expiresStr, sig] = parts;
  const payload = `${v}.${expiresStr}`;
  if (!safeEqual(sig, sign(payload))) return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}

export { COOKIE_NAME };
