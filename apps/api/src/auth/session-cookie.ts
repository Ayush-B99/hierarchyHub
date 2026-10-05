import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Request } from 'express';

export const SESSION_COOKIE = 'hh_session';

/** a new random session token for the cookie, and the hash we keep in the database */
export function newSessionToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, id: hashToken(token) };
}

/** only the hash is stored, so someone with a copy of the sessions table still can't sign in */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** the session token from the request's cookies, if it has one that looks right */
export function tokenFrom(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      const value = rest.join('=');
      // 32 random bytes in base64url is always 43 characters
      return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
    }
  }
  return undefined;
}

/**
 * httpOnly so page scripts can never read it, sameSite lax so other websites can't send it
 * with their requests, and secure in production so it only travels over https
 */
export const cookieOptions = (secure: boolean, maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/api',
  maxAge: maxAgeMs,
});
