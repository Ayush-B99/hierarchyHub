import { describe, expect, it } from 'vitest';
import { formatDate, formatSalary, plural } from './format';

describe('format helpers', () => {
  it('formats salaries in rand with spaces', () => {
    expect(formatSalary(125000)).toBe('R 125 000');
    expect(formatSalary(4500.5)).toBe('R 4 500,50');
  });

  it('formats ISO dates', () => {
    expect(formatDate('1985-04-12')).toBe('12 Apr 1985');
  });

  it('pluralises', () => {
    expect(plural(1, 'report', 'reports')).toBe('1 report');
    expect(plural(3, 'report', 'reports')).toBe('3 reports');
  });
});
