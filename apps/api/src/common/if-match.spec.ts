import { HttpException } from '@nestjs/common';
import { expectedVersion } from './if-match';

const statusOf = (header: string | undefined) => {
  try {
    expectedVersion(header);
    return 200;
  } catch (error) {
    return (error as HttpException).getStatus();
  }
};

describe('expectedVersion', () => {
  it('reads the version from the etag', () => {
    expect(expectedVersion('"v3"')).toBe(3);
    expect(expectedVersion(' "v12" ')).toBe(12);
  });

  it('refuses "any version" and weak tags, which would skip the clash check (400)', () => {
    expect(statusOf('*')).toBe(400);
    expect(statusOf('W/"v12"')).toBe(400);
  });

  it('insists on the header being there (428)', () => {
    expect(statusOf(undefined)).toBe(428);
  });

  it('refuses anything that does not look like one of our etags (400)', () => {
    expect(statusOf('3')).toBe(400);
    expect(statusOf('"abc"')).toBe(400);
    expect(statusOf('"v3", "v4"')).toBe(400);
  });
});
