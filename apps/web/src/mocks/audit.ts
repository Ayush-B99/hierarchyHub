import type {
  AuditAction,
  AuditEvent,
  AuditQuery,
  Employee,
  HistoryRow,
  Me,
} from '@hierarchy-hub/shared';
import { sampleHistory } from '@hierarchy-hub/shared/testing';
import { db } from './db';

/** the mock api's audit trail, with the same rules as the real one (adr 0018) */

interface Row extends AuditEvent {
  scope: string[];
}

let rows: Row[] = [];
const FOR_EVERY_ADMIN: AuditAction[] = ['account.signed_up', 'account.rejected'];

/** the person and everyone above them, right now */
function chainOf(employeeId: string): string[] {
  const chain: string[] = [];
  let current: Employee | undefined = db.find(employeeId);
  while (current && !chain.includes(current.id)) {
    chain.push(current.id);
    current = current.managerId ? db.find(current.managerId) : undefined;
  }
  return chain;
}

export const nameOf = (e: { firstName: string; lastName: string }) =>
  `${e.firstName} ${e.lastName}`;

export const audit = {
  reset() {
    rows = sampleHistory()
      .map((event, i) => ({
        id: `seeded-${i}`,
        at: event.at.toISOString(),
        action: event.action,
        actor: event.actor,
        subject: { employeeId: event.subjectEmployeeId, name: event.subjectName },
        changes: event.changes,
        details: event.details,
        requestId: null,
        scope: event.scope,
      }))
      .reverse();
  },
  employeeChanges(): HistoryRow[] {
    return rows
      .filter((row) => row.action.startsWith('employee.') && row.subject?.employeeId)
      .map((row) => ({
        id: row.id,
        at: row.at,
        action: row.action,
        subjectEmployeeId: row.subject?.employeeId ?? null,
        subjectName: row.subject?.name ?? null,
        changes: row.changes,
        details: row.details,
      }));
  },
  record(event: {
    action: AuditAction;
    actor?: Me | null;
    subject?: { employeeId: string; name: string } | null;
    changes?: AuditEvent['changes'];
    details?: AuditEvent['details'];
    scope?: string[];
  }) {
    rows = [
      {
        id: crypto.randomUUID(),
        at: new Date(Date.now() + rows.length).toISOString(),
        action: event.action,
        actor: event.actor ? { employeeId: event.actor.employeeId, name: event.actor.name } : null,
        subject: event.subject ?? null,
        changes: event.changes ?? null,
        details: event.details ?? null,
        requestId: null,
        scope: event.scope ?? (event.subject ? chainOf(event.subject.employeeId) : []),
      },
      ...rows,
    ];
  },
  chainOf,
  list(viewer: Me, q: AuditQuery) {
    const atTop = db.find(viewer.employeeId)?.managerId === null;
    const matching = rows.filter(
      (row) =>
        (atTop || row.scope.includes(viewer.employeeId) || FOR_EVERY_ADMIN.includes(row.action)) &&
        (!q.action || row.action === q.action) &&
        (!q.employeeId ||
          row.subject?.employeeId === q.employeeId ||
          row.actor?.employeeId === q.employeeId),
    );
    const start = (q.page - 1) * q.pageSize;
    return {
      items: matching.slice(start, start + q.pageSize).map(({ scope: _scope, ...event }) => event),
      total: matching.length,
      page: q.page,
      pageSize: q.pageSize,
    };
  },
};
