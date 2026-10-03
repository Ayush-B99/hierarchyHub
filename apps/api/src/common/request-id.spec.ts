import { requestIdFrom } from './request-id';

describe('requestIdFrom', () => {
  it('keeps a sensible id the caller sent', () => {
    expect(requestIdFrom('abc-123-def-456')).toBe('abc-123-def-456');
  });

  it('replaces anything odd, so logs cannot be polluted', () => {
    for (const bad of [
      undefined,
      '',
      'short',
      'has spaces in it',
      'x'.repeat(65),
      'line\nbreak-injected',
    ]) {
      expect(requestIdFrom(bad)).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});
