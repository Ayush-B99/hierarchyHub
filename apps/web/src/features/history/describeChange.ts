import type { OrgChange, OrgPerson } from '@hierarchy-hub/shared';

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

export function describeChange(change: OrgChange, people: Map<string, OrgPerson>): string {
  const who = change.name || 'Someone';

  if (change.action === 'employee.created') return `${who} joined`;
  if (change.action === 'employee.deleted') return `${who} left`;

  const managerId = change.changes.managerId?.to;
  if (managerId !== undefined) {
    const manager = managerId ? people.get(managerId) : undefined;
    return manager ? `${who} moved to ${fullName(manager)}'s team` : `${who} moved to the top`;
  }

  const role = change.changes.role?.to;
  if (role) return `${who} became ${role}`;

  return `${who}'s details changed`;
}
