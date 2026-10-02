import { describe, expect, it } from 'vitest';
import { buildForest, chainToTop, descendantsOf, wouldCreateCycle } from './hierarchy';

const people = [
  { id: 'ceo', managerId: null },
  { id: 'cto', managerId: 'ceo' },
  { id: 'dev', managerId: 'cto' },
  { id: 'cfo', managerId: 'ceo' },
];
const byId = new Map(people.map((p) => [p.id, p]));
const managerOf = (id: string) => byId.get(id)?.managerId;

describe('buildForest', () => {
  it('nests employees under their managers', () => {
    const [root] = buildForest(people);
    expect(root?.data.id).toBe('ceo');
    expect(root?.children.map((c) => c.data.id)).toEqual(['cto', 'cfo']);
  });

  it('promotes people with a missing manager to roots', () => {
    expect(buildForest([{ id: 'x', managerId: 'missing' }])).toHaveLength(1);
  });
});

describe('wouldCreateCycle', () => {
  it('blocks being your own manager', () => {
    expect(wouldCreateCycle('cto', 'cto', managerOf)).toBe(true);
  });
  it('blocks picking someone from your own team', () => {
    expect(wouldCreateCycle('cto', 'dev', managerOf)).toBe(true);
  });
  it('allows a valid move', () => {
    expect(wouldCreateCycle('dev', 'cfo', managerOf)).toBe(false);
  });
  it('allows removing the manager', () => {
    expect(wouldCreateCycle('cto', null, managerOf)).toBe(false);
  });
});

describe('chainToTop and descendantsOf', () => {
  it('walks up to the top', () => {
    expect(chainToTop('dev', byId).map((p) => p.id)).toEqual(['ceo', 'cto', 'dev']);
  });
  it('finds everyone below', () => {
    expect(
      descendantsOf('ceo', people)
        .map((p) => p.id)
        .sort(),
    ).toEqual(['cfo', 'cto', 'dev']);
  });
});
