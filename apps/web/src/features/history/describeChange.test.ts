import type { OrgChange, OrgPerson } from '@hierarchy-hub/shared';
import { describe, expect, it } from 'vitest';
import { describeChange } from './describeChange';

const change = (over: Partial<OrgChange>): OrgChange => ({
  id: '1',
  at: '2026-10-01T00:00:00Z',
  action: 'employee.updated',
  employeeId: 'ruan',
  name: 'Ruan Botha',
  changes: {},
  person: null,
  team: [],
  ...over,
});

const people = new Map<string, OrgPerson>([
  [
    'johan',
    {
      id: 'johan',
      firstName: 'Johan',
      lastName: 'van der Merwe',
      email: '',
      employeeNumber: '',
      role: '',
      managerId: null,
    },
  ],
]);

describe('describing a change', () => {
  it('in plain words', () => {
    expect(describeChange(change({ action: 'employee.created' }), people)).toBe(
      'Ruan Botha joined',
    );
    expect(describeChange(change({ action: 'employee.deleted' }), people)).toBe('Ruan Botha left');
    expect(
      describeChange(change({ changes: { managerId: { from: null, to: 'johan' } } }), people),
    ).toBe("Ruan Botha moved to Johan van der Merwe's team");
    expect(
      describeChange(change({ changes: { role: { from: 'A', to: 'Lead Engineer' } } }), people),
    ).toBe('Ruan Botha became Lead Engineer');
  });
});
