import { describe, expect, it } from 'vitest';
import { seedEmployees, SEED_IDS } from '../../mocks/seed';
import { buildOrgIndex } from './orgIndex';

describe('buildOrgIndex', () => {
  const org = buildOrgIndex(seedEmployees());

  it('finds the top of the org', () => {
    expect(org.roots.map((e) => e.firstName)).toEqual(['Thandi']);
  });

  it('lists direct reports sorted by surname', () => {
    expect(org.reportsOf(SEED_IDS.engineeringManager).map((e) => e.lastName)).toEqual([
      'Botha',
      'Molefe',
      'Mthembu',
      'Naidoo',
    ]);
  });

  it('walks the chain up to the top', () => {
    expect(org.chainOf(SEED_IDS.seniorEngineer).map((e) => e.firstName)).toEqual([
      'Thandi',
      'Sipho',
      'Johan',
      'Ruan',
    ]);
  });

  it('counts everyone under a person', () => {
    expect(org.teamSizeOf(SEED_IDS.ceo)).toBe(13);
    expect(org.teamSizeOf(SEED_IDS.cto)).toBe(7);
    expect(org.teamSizeOf(SEED_IDS.seniorEngineer)).toBe(0);
  });
});
