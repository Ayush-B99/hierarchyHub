import { describe, expect, it } from 'vitest';
import { gravatarUrl } from './gravatar';

describe('gravatarUrl', () => {
  it('hashes the tidied email with SHA-256, so the address itself is never sent', async () => {
    const url = await gravatarUrl('  Test@Example.COM ', 80);
    // sha256('test@example.com')
    expect(url).toBe(
      'https://gravatar.com/avatar/973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b?s=80&d=blank',
    );
  });

  it('asks for a transparent image when there is no picture, not a 404 that clutters the console', async () => {
    const url = await gravatarUrl('nobody@example.com', 40);
    expect(url).toContain('d=blank');
    expect(url).not.toContain('d=404');
  });
});
