import { describe, expect, it } from 'vitest';
import { sampleHistory } from '../testing/sampleHistory';
import { changeTimes, orgAt, toOrgChange, type OrgChange, type OrgPerson } from './history';

const person = (id: string, managerId: string | null, role = 'Engineer'): OrgPerson => ({
  id,
  firstName: id,
  lastName: 'Test',
  email: `${id}@example.com`,
  employeeNumber: `EMP-${id}`,
  role,
  managerId,
});

const change = (
  over: Partial<OrgChange> & Pick<OrgChange, 'at' | 'action' | 'employeeId'>,
): OrgChange => ({
  id: `${over.at}-${over.employeeId}`,
  name: over.employeeId,
  changes: {},
  person: null,
  team: [],
  ...over,
});

const today = [person('boss', null, 'CEO'), person('ann', 'boss'), person('ben', 'boss')];

const managerOf = (people: OrgPerson[], id: string) => people.find((p) => p.id === id)?.managerId;

describe('the organisation at a moment', () => {
  it('is today when nothing changed since', () => {
    expect(orgAt(today, [], '2026-01-01T00:00:00Z')).toEqual(today);
  });

  it('takes away people added later', () => {
    const changes = [
      change({ at: '2026-02-01T00:00:00Z', action: 'employee.created', employeeId: 'ben' }),
    ];
    expect(orgAt(today, changes, '2026-01-15T00:00:00Z').map((p) => p.id)).toEqual(['boss', 'ann']);
    expect(orgAt(today, changes, '2026-02-01T00:00:00Z')).toHaveLength(3);
  });

  it('puts back what a change replaced', () => {
    const changes = [
      change({
        at: '2026-02-01T00:00:00Z',
        action: 'employee.updated',
        employeeId: 'ann',
        changes: {
          role: { from: 'Junior Engineer', to: 'Engineer' },
          managerId: { from: 'ben', to: 'boss' },
        },
      }),
    ];
    const before = orgAt(today, changes, '2026-01-01T00:00:00Z');
    expect(before.find((p) => p.id === 'ann')).toMatchObject({
      role: 'Junior Engineer',
      managerId: 'ben',
    });
  });

  it('brings back someone deleted, with the team that moved up when they left', () => {
    const now = [person('boss', null), person('ann', 'boss'), person('ben', 'boss')];
    const changes = [
      change({
        at: '2026-02-01T00:00:00Z',
        action: 'employee.deleted',
        employeeId: 'cara',
        person: person('cara', 'boss', 'Manager'),
        team: ['ann', 'ben'],
      }),
    ];
    const before = orgAt(now, changes, '2026-01-01T00:00:00Z');
    expect(before.map((p) => p.id).sort()).toEqual(['ann', 'ben', 'boss', 'cara']);
    expect(managerOf(before, 'ann')).toBe('cara');
    expect(managerOf(before, 'ben')).toBe('cara');
  });

  it('undoes several changes newest first, so each one sees the state it changed', () => {
    const changes = [
      change({
        at: '2026-01-10T00:00:00Z',
        action: 'employee.updated',
        employeeId: 'ann',
        changes: { role: { from: 'Intern', to: 'Junior' } },
      }),
      change({
        at: '2026-01-20T00:00:00Z',
        action: 'employee.updated',
        employeeId: 'ann',
        changes: { role: { from: 'Junior', to: 'Engineer' } },
      }),
    ];
    const role = (at: string) => orgAt(today, changes, at).find((p) => p.id === 'ann')?.role;
    expect(role('2026-01-05T00:00:00Z')).toBe('Intern');
    expect(role('2026-01-15T00:00:00Z')).toBe('Junior');
    expect(role('2026-01-25T00:00:00Z')).toBe('Engineer');
  });

  it('never leaves anyone pointing at a manager who isn’t there', () => {
    const changes = [
      change({ at: '2026-02-01T00:00:00Z', action: 'employee.created', employeeId: 'boss' }),
    ];
    const before = orgAt(today, changes, '2026-01-01T00:00:00Z');
    expect(before.every((p) => p.managerId === null)).toBe(true);
  });

  it('lists each moment something changed, oldest first, once', () => {
    const changes = [
      change({ at: '2026-03-01T00:00:00Z', action: 'employee.created', employeeId: 'a' }),
      change({ at: '2026-01-01T00:00:00Z', action: 'employee.created', employeeId: 'b' }),
      change({ at: '2026-03-01T00:00:00Z', action: 'employee.created', employeeId: 'c' }),
    ];
    expect(changeTimes(changes)).toEqual(['2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z']);
  });
});

describe('the sample history', () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const people: [number, string, string, string, number | null][] = [
    [1, 'Thandi', 'Nkosi', 'Chief Executive Officer', null],
    [2, 'Sipho', 'Dlamini', 'Chief Technology Officer', 1],
    [3, 'Ayesha', 'Patel', 'Chief Financial Officer', 1],
    [4, 'Lerato', 'Mokoena', 'Head of People', 1],
    [5, 'Johan', 'van der Merwe', 'Engineering Manager', 2],
    [6, 'Naledi', 'Khumalo', 'Head of Product', 2],
    [7, 'Ruan', 'Botha', 'Senior Engineer', 5],
    [8, 'Zanele', 'Mthembu', 'Software Engineer', 5],
    [9, 'Kagiso', 'Molefe', 'Software Engineer', 5],
    [10, 'Priya', 'Naidoo', 'QA Engineer', 5],
    [11, 'Megan', 'Fourie', 'Product Designer', 6],
    [12, 'Thabo', 'Sithole', 'Financial Analyst', 3],
    [13, 'Fatima', 'Adams', 'Accountant', 3],
    [14, 'Bongani', 'Zulu', 'HR Partner', 4],
  ];
  const today: OrgPerson[] = people.map(([n, firstName, lastName, role, manager]) => ({
    id: id(n),
    firstName,
    lastName,
    email: `${firstName}.${lastName.replace(/\s+/g, '')}@example.com`.toLowerCase(),
    employeeNumber: `EMP-${String(n).padStart(4, '0')}`,
    role,
    managerId: manager === null ? null : id(manager),
  }));

  const now = new Date('2026-10-08T12:00:00Z');
  const changes = sampleHistory(now).map((event, i) =>
    toOrgChange({
      id: String(i),
      at: event.at.toISOString(),
      action: event.action,
      subjectEmployeeId: event.subjectEmployeeId,
      subjectName: event.subjectName,
      changes: event.changes,
      details: event.details,
    }),
  );
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const find = (org: OrgPerson[], n: number) => org.find((p) => p.id === id(n));

  it('tells a story that adds up at every step', () => {
    const sixWeeksAgo = orgAt(today, changes, daysAgo(45));
    expect(find(sixWeeksAgo, 11)).toBeUndefined();
    expect(find(sixWeeksAgo, 9)).toBeUndefined();
    expect(find(sixWeeksAgo, 10)?.role).toBe('Junior QA Engineer');
    expect(find(sixWeeksAgo, 7)?.managerId).toBe(id(6));
    expect(find(sixWeeksAgo, 15)?.role).toBe('Finance Manager');
    expect(find(sixWeeksAgo, 12)?.managerId).toBe(id(15));
    expect(find(sixWeeksAgo, 4)?.role).toBe('HR Manager');

    const threeWeeksAgo = orgAt(today, changes, daysAgo(21));
    expect(find(threeWeeksAgo, 11)?.managerId).toBe(id(6));
    expect(find(threeWeeksAgo, 7)?.managerId).toBe(id(5));
    expect(find(threeWeeksAgo, 15)).toBeDefined();

    expect(orgAt(today, changes, now.toISOString())).toEqual(today);
  });
});
