import { describe, expect, it } from 'vitest';
import {
  expectedSalary,
  leastSquares,
  payFlags,
  salaryRange,
  solve,
  teamSizes,
  trainPayModel,
  type PayPerson,
} from './payModel';

const sample: PayPerson[] = [
  { id: 'thandi', managerId: null, salary: 185000 },
  { id: 'sipho', managerId: 'thandi', salary: 162000 },
  { id: 'ayesha', managerId: 'thandi', salary: 158000 },
  { id: 'lerato', managerId: 'thandi', salary: 121000 },
  { id: 'johan', managerId: 'sipho', salary: 98000 },
  { id: 'naledi', managerId: 'sipho', salary: 104000 },
  { id: 'ruan', managerId: 'johan', salary: 76000 },
  { id: 'zanele', managerId: 'johan', salary: 54000 },
  { id: 'kagiso', managerId: 'johan', salary: 51000 },
  { id: 'priya', managerId: 'johan', salary: 47000 },
  { id: 'megan', managerId: 'naledi', salary: 58000 },
  { id: 'thabo', managerId: 'ayesha', salary: 49000 },
  { id: 'fatima', managerId: 'ayesha', salary: 45000 },
  { id: 'bongani', managerId: 'lerato', salary: 44000 },
];

describe('team sizes', () => {
  it('counts everyone below each person', () => {
    const sizes = teamSizes(sample);
    expect(sizes.get('thandi')).toBe(13);
    expect(sizes.get('sipho')).toBe(7);
    expect(sizes.get('johan')).toBe(4);
    expect(sizes.get('ruan')).toBe(0);
  });

  it('does not loop forever on bad data', () => {
    const sizes = teamSizes([
      { id: 'a', managerId: 'b', salary: 1 },
      { id: 'b', managerId: 'a', salary: 1 },
    ]);
    expect(sizes.get('a')).toBe(2);
  });
});

describe('solving the equations', () => {
  it('solves a small system', () => {
    expect(
      solve(
        [
          [2, 1],
          [1, 3],
        ],
        [5, 10],
      ),
    ).toEqual([1, 3]);
  });

  it('says so when there is no single answer', () => {
    expect(
      solve(
        [
          [1, 2],
          [2, 4],
        ],
        [3, 6],
      ),
    ).toBeNull();
  });

  it('finds the line through points on a line', () => {
    const weights = leastSquares(
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [10, 12, 14],
    )!;
    expect(weights[0]).toBeCloseTo(10);
    expect(weights[1]).toBeCloseTo(2);
  });
});

describe('training', () => {
  it('learns the exact formula from data made with it', () => {
    const formula = (team: number) =>
      40000 + 10000 * Math.log2(1 + team) + 5000 * (team > 0 ? 1 : 0);
    const people: PayPerson[] = [
      { id: 'top', managerId: null, salary: 0 },
      { id: 'a', managerId: 'top', salary: 0 },
      { id: 'b', managerId: 'top', salary: 0 },
      { id: 'c', managerId: 'a', salary: 0 },
      { id: 'd', managerId: 'a', salary: 0 },
      { id: 'e', managerId: 'b', salary: 0 },
    ];
    const sizes = teamSizes(people);
    for (const p of people) p.salary = formula(sizes.get(p.id)!);

    const model = trainPayModel(people)!;
    expect(model.weights[0]).toBeCloseTo(40000);
    expect(model.weights[1]).toBeCloseTo(10000);
    expect(model.weights[2]).toBeCloseTo(5000);
    expect(model.typicalError).toBeCloseTo(0);
  });

  it('needs at least five salaries to learn anything', () => {
    expect(trainPayModel(sample.slice(0, 4))).toBeNull();
  });

  it('only learns from salaries it can see', () => {
    const hidden = sample.map((p) => (p.id === 'ruan' ? p : { ...p, salary: null }));
    expect(trainPayModel(hidden)).toBeNull();
  });

  it('drops a feature when the data cannot separate them', () => {
    const team = sample.filter((p) =>
      ['johan', 'ruan', 'zanele', 'kagiso', 'priya'].includes(p.id),
    );
    const model = trainPayModel(
      team.map((p) => (p.id === 'johan' ? { ...p, managerId: null } : p)),
    )!;
    expect(model.weights).toHaveLength(2);
    expect(expectedSalary(model, 4)).toBeCloseTo(98000);
  });
});

describe('flags and ranges on the sample organisation', () => {
  const model = trainPayModel(sample)!;

  it('flags only people well away from what their position usually earns', () => {
    const flags = payFlags(sample, model);
    expect(flags.map((f) => f.employeeId)).toEqual(['ruan', 'johan']);
    expect(flags[0]!.difference).toBeGreaterThan(0.25);
    expect(flags[1]!.difference).toBeLessThan(-0.25);
  });

  it('suggests a sensible range for someone new with no team', () => {
    const { low, high } = salaryRange(model, 0);
    expect(low).toBeGreaterThan(30000);
    expect(high).toBeLessThan(80000);
    expect(low % 1000).toBe(0);
  });
});
