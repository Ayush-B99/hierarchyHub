import type { AuditAction, AuditEvent, AuditManager } from '@hierarchy-hub/shared';
import { formatDate, formatSalary } from '../../lib/format';

/** the audit trail in plain words, one sentence per event plus a line per change */

export const ACTION_LABELS: Record<AuditAction, string> = {
  'employee.created': 'People added',
  'employee.updated': 'People changed',
  'employee.deleted': 'People deleted',
  'account.signed_up': 'Accounts asked for',
  'account.approved': 'Accounts approved',
  'account.rejected': 'Requests rejected',
  'account.updated': 'Access changed',
  'auth.signed_in': 'Sign ins',
  'auth.sign_in_failed': 'Failed sign ins',
  'auth.locked': 'Accounts locked',
  'auth.signed_out': 'Sign outs',
};

const FIELD_LABELS: Record<string, string> = {
  employeeNumber: 'employee number',
  firstName: 'first name',
  lastName: 'surname',
  email: 'email',
  birthDate: 'birth date',
  salary: 'salary',
  role: 'role',
  managerId: 'manager',
  isAdmin: 'admin',
  status: 'account',
};

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const isManager = (value: unknown): value is AuditManager =>
  typeof value === 'object' && value !== null && 'name' in value;

/** one value as a person would say it */
export function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return field === 'managerId' ? 'nobody (top of the organisation)' : 'nothing';
  }
  if (field === 'salary' && typeof value === 'number') return formatSalary(value);
  if (field === 'birthDate' && typeof value === 'string') return formatDate(value);
  if (field === 'managerId' && isManager(value)) return value.name;
  if (field === 'isAdmin') return value ? 'yes' : 'no';
  if (field === 'status') return value === 'disabled' ? 'turned off' : 'on';
  return String(value);
}

/** "role from Senior Engineer to Lead Engineer", one per changed field */
export function describeChanges(event: AuditEvent): string[] {
  if (
    !event.changes ||
    event.action === 'employee.created' ||
    event.action === 'employee.deleted'
  ) {
    return [];
  }
  return Object.entries(event.changes).map(
    ([field, { from, to }]) =>
      `${FIELD_LABELS[field] ?? field} from ${formatValue(field, from)} to ${formatValue(field, to)}`,
  );
}

export function describe(event: AuditEvent): string {
  const actor = event.actor?.name ?? 'Someone';
  const subject = event.subject?.name ?? 'someone';
  const d = event.details ?? {};
  switch (event.action) {
    case 'employee.created':
      return `${actor} added ${subject}`;
    case 'employee.updated':
      return `${actor} changed ${subject}`;
    case 'employee.deleted': {
      const movedTo = isManager(d.teamMovedTo) ? d.teamMovedTo.name : null;
      const team = Array.isArray(d.team) ? d.team.length : 0;
      if (team === 0) return `${actor} deleted ${subject}`;
      return `${actor} deleted ${subject}. Their team of ${team} moved to ${movedTo ?? 'the top of the organisation'}`;
    }
    case 'account.signed_up':
      return `${text(d.accountName)} (${text(d.accountEmail)}) asked for an account`;
    case 'account.approved':
      return `${actor} approved ${text(d.accountName)}'s account as ${subject}`;
    case 'account.rejected':
      return `${actor} rejected the request from ${text(d.accountName)} (${text(d.accountEmail)})`;
    case 'account.updated': {
      const c = event.changes ?? {};
      if (c.status)
        return `${actor} turned ${subject}'s account ${c.status.to === 'disabled' ? 'off' : 'on'}`;
      return c.isAdmin?.to
        ? `${actor} made ${subject} an admin`
        : `${actor} removed ${subject}'s admin access`;
    }
    case 'auth.signed_in':
      return `${subject} signed in`;
    case 'auth.sign_in_failed':
      return d.reason === 'unknown email'
        ? `Failed sign in for ${text(d.email)}, which has no account`
        : `Failed sign in for ${subject}: wrong password`;
    case 'auth.locked':
      return `${subject}'s account was locked after too many wrong passwords`;
    case 'auth.signed_out':
      return `${subject} signed out`;
  }
}
