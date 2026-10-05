import type { AuditEvent } from '@hierarchy-hub/shared';
import { describe as group, expect, it } from 'vitest';
import { describe, describeChanges } from './describe';

const event = (over: Partial<AuditEvent>): AuditEvent => ({
  id: 'e1',
  at: '2026-10-06T10:00:00.000Z',
  action: 'employee.updated',
  actor: { employeeId: 'a', name: 'Johan van der Merwe' },
  subject: { employeeId: 'b', name: 'Ruan Botha' },
  changes: null,
  details: null,
  requestId: null,
  ...over,
});

group('describing events', () => {
  it('a change, with each field in plain words', () => {
    const e = event({
      changes: {
        role: { from: 'Senior Engineer', to: 'Lead Engineer' },
        salary: { from: 76000, to: 80000 },
        birthDate: { from: '1990-02-02', to: '1990-03-02' },
      },
    });
    expect(describe(e)).toBe('Johan van der Merwe changed Ruan Botha');
    expect(describeChanges(e)).toEqual([
      'role from Senior Engineer to Lead Engineer',
      'salary from R 76 000 to R 80 000',
      'birth date from 2 Feb 1990 to 2 Mar 1990',
    ]);
  });

  it('a move, by manager name', () => {
    const e = event({
      changes: {
        managerId: {
          from: { id: 'j', name: 'Johan van der Merwe' },
          to: { id: 'n', name: 'Naledi Khumalo' },
        },
      },
    });
    expect(describeChanges(e)).toEqual(['manager from Johan van der Merwe to Naledi Khumalo']);
  });

  it('a delete, and where the team went', () => {
    const e = event({
      action: 'employee.deleted',
      details: {
        teamMovedTo: { id: 's', name: 'Sipho Dlamini' },
        team: ['Ruan Botha', 'Zanele Mthembu'],
      },
    });
    expect(describe(e)).toBe(
      'Johan van der Merwe deleted Ruan Botha. Their team of 2 moved to Sipho Dlamini',
    );
  });

  it('access changes and sign ins', () => {
    expect(
      describe(
        event({ action: 'account.updated', changes: { isAdmin: { from: false, to: true } } }),
      ),
    ).toBe('Johan van der Merwe made Ruan Botha an admin');
    expect(
      describe(
        event({
          action: 'account.updated',
          changes: { status: { from: 'active', to: 'disabled' } },
        }),
      ),
    ).toBe("Johan van der Merwe turned Ruan Botha's account off");
    expect(
      describe(
        event({
          action: 'auth.sign_in_failed',
          actor: null,
          subject: null,
          details: { email: 'x@y.co', reason: 'unknown email' },
        }),
      ),
    ).toBe('Failed sign in for x@y.co, which has no account');
    expect(describe(event({ action: 'auth.locked' }))).toBe(
      "Ruan Botha's account was locked after too many wrong passwords",
    );
  });
});
