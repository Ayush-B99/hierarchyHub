import { escapeLike } from './employees.repository';

describe('escapeLike', () => {
  it('makes like wildcards literal', () => {
    expect(escapeLike('50%_off')).toBe('50\\%\\_off');
    expect(escapeLike('back\\slash')).toBe('back\\\\slash');
    expect(escapeLike('plain')).toBe('plain');
  });
});
