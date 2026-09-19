import { createHmac } from 'node:crypto';

/**
 * Minimal Ghost Admin API client for the one-off scripts (theme upload, import).
 * No dependency: an Admin key is `<id>:<hex secret>`, and a request is authenticated
 * by an HS256 JWT with `kid = id`, `aud = "/admin/"`, `exp` within five minutes,
 * signed with the secret HEX-DECODED (signing with the hex string itself is the
 * classic mistake and fails with a 401).
 */

const b64url = (b) => Buffer.from(b).toString('base64url');

export function adminToken(adminKey, now = Math.floor(Date.now() / 1000)) {
  const [id, secret] = String(adminKey ?? '').split(':');
  if (!id || !secret) throw new Error('GHOST_ADMIN_KEY must look like <id>:<secret>');
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }));
  const body = b64url(JSON.stringify({ iat: now, exp: now + 5 * 60, aud: '/admin/' }));
  const sig = createHmac('sha256', Buffer.from(secret, 'hex')).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

export function ghostEnv() {
  const url = (process.env.GHOST_URL ?? '').replace(/\/$/, '');
  const adminKey = process.env.GHOST_ADMIN_KEY;
  if (!url) throw new Error('GHOST_URL is not set');
  if (!adminKey) throw new Error('GHOST_ADMIN_KEY is not set');
  return { url, adminKey };
}

/** Admin API call. Throws on any non-2xx with Ghost's own message, so a failure is loud. */
export async function admin(method, path, { json, form } = {}) {
  const { url, adminKey } = ghostEnv();
  const headers = { Authorization: `Ghost ${adminToken(adminKey)}`, 'Accept-Version': 'v6.0' };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(`${url}/ghost/api/admin/${path}`, { method, headers, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}
