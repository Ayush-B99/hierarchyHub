export const STRUCTURE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'employeeNumber',
  'role',
  'managerId',
] as const;

export type StructureField = (typeof STRUCTURE_FIELDS)[number];

export interface OrgPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  role: string;
  managerId: string | null;
}

export type OrgChangeAction = 'employee.created' | 'employee.updated' | 'employee.deleted';

export interface OrgChange {
  id: string;
  at: string;
  action: OrgChangeAction;
  employeeId: string;
  name: string;
  changes: Partial<Record<StructureField, { from: string | null; to: string | null }>>;
  person: OrgPerson | null;
  team: string[];
}

export interface HistoryRow {
  id: string;
  at: string;
  action: string;
  subjectEmployeeId: string | null;
  subjectName: string | null;
  changes: unknown;
  details: unknown;
}

type Change = { from: unknown; to: unknown };

const asId = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return String(value.id);
  return null;
};

const asText = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

function structureChanges(raw: unknown): OrgChange['changes'] {
  const changes = (raw ?? {}) as Record<string, Change>;
  const result: OrgChange['changes'] = {};
  for (const field of STRUCTURE_FIELDS) {
    const value = changes[field];
    if (!value) continue;
    result[field] =
      field === 'managerId'
        ? { from: asId(value.from), to: asId(value.to) }
        : { from: asText(value.from), to: asText(value.to) };
  }
  return result;
}

function personFromChanges(
  id: string,
  changes: OrgChange['changes'],
  side: 'from' | 'to',
): OrgPerson {
  const get = (field: StructureField) => changes[field]?.[side] ?? '';
  return {
    id,
    firstName: get('firstName') ?? '',
    lastName: get('lastName') ?? '',
    email: get('email') ?? '',
    employeeNumber: get('employeeNumber') ?? '',
    role: get('role') ?? '',
    managerId: changes.managerId?.[side] ?? null,
  };
}

function deletedPerson(row: HistoryRow, changes: OrgChange['changes']): OrgPerson {
  const details = (row.details ?? {}) as { person?: OrgPerson; employeeNumber?: string };
  if (details.person) return details.person;
  const [firstName = '', ...rest] = (row.subjectName ?? '').split(' ');
  return {
    id: row.subjectEmployeeId ?? '',
    firstName,
    lastName: rest.join(' '),
    email: '',
    employeeNumber: details.employeeNumber ?? '',
    role: changes.role?.from ?? '',
    managerId: changes.managerId?.from ?? null,
  };
}

export function toOrgChange(row: HistoryRow): OrgChange {
  const action = row.action as OrgChangeAction;
  const employeeId = row.subjectEmployeeId ?? '';
  const changes = structureChanges(row.changes);
  const details = (row.details ?? {}) as { teamIds?: string[] };

  return {
    id: row.id,
    at: row.at,
    action,
    employeeId,
    name: row.subjectName ?? '',
    changes: action === 'employee.deleted' ? {} : changes,
    person:
      action === 'employee.created'
        ? personFromChanges(employeeId, changes, 'to')
        : action === 'employee.deleted'
          ? deletedPerson(row, changes)
          : null,
    team: action === 'employee.deleted' ? (details.teamIds ?? []) : [],
  };
}

function undo(people: Map<string, OrgPerson>, change: OrgChange) {
  if (change.action === 'employee.created') {
    people.delete(change.employeeId);
    return;
  }

  if (change.action === 'employee.deleted') {
    if (change.person) people.set(change.employeeId, { ...change.person });
    for (const memberId of change.team) {
      const member = people.get(memberId);
      if (member) people.set(memberId, { ...member, managerId: change.employeeId });
    }
    return;
  }

  const person = people.get(change.employeeId);
  if (!person) return;
  const restored = { ...person };
  for (const field of STRUCTURE_FIELDS) {
    const value = change.changes[field];
    if (!value) continue;
    if (field === 'managerId') restored.managerId = value.from;
    else restored[field] = value.from ?? '';
  }
  people.set(change.employeeId, restored);
}

export function orgAt(
  current: readonly OrgPerson[],
  changes: readonly OrgChange[],
  at: string,
): OrgPerson[] {
  const people = new Map(current.map((p) => [p.id, { ...p }]));
  const newestFirst = [...changes].sort((a, b) => b.at.localeCompare(a.at));

  for (const change of newestFirst) {
    if (change.at <= at) break;
    undo(people, change);
  }

  const result = [...people.values()];
  const ids = new Set(result.map((p) => p.id));
  return result.map((p) => (p.managerId && !ids.has(p.managerId) ? { ...p, managerId: null } : p));
}

export function changeTimes(changes: readonly OrgChange[]): string[] {
  return [...new Set(changes.map((c) => c.at))].sort();
}
