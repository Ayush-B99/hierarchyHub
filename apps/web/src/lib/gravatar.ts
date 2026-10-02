const cache = new Map<string, Promise<string | null>>();

async function sha256(text: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gravatar image URL for an email (ADR 0006). The email is trimmed, lower-cased and
 * hashed in the browser, so the plain address never leaves the app.
 * `d=404` makes Gravatar return an error when there is no picture, so the
 * Avatar component can show its own initials disc instead.
 */
export function gravatarUrl(email: string, size: number): Promise<string | null> {
  const key = `${email.trim().toLowerCase()}|${size}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = sha256(email.trim().toLowerCase()).then((hash) =>
      hash ? `https://gravatar.com/avatar/${hash}?s=${size}&d=404` : null,
    );
    cache.set(key, pending);
  }
  return pending;
}
