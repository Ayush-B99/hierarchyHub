/**
 * where to go after signing in. only a path inside the app, never a full address, so a link
 * like ?next=https://evil.example can't send someone to another website
 */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : '/';
}
