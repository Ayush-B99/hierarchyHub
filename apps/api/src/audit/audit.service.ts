import { Injectable } from '@nestjs/common';
import type { AuditAction, AuditEvent, AuditQuery, Paginated } from '@hierarchy-hub/shared';
import { Prisma, type AuditEvent as AuditRow } from '@prisma/client';
import type { SignedInAccount } from '../auth/auth.types';
import { currentRequestId } from '../common/request-id';
import { DatabaseService } from '../database/database.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';

/** who did something, as far as the audit trail is concerned */
export interface Actor {
  accountId: string;
  employeeId: string | null;
  name: string;
}

export const actorFrom = (account: SignedInAccount): Actor => ({
  accountId: account.id,
  employeeId: account.employeeId,
  name: account.name,
});

export interface NewEvent {
  action: AuditAction;
  /** who could see it, if worked out earlier (eg before the subject was deleted) */
  scope?: string[];
  actor?: Actor | null;
  subject?: { employeeId: string; name: string } | null;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
  details?: Record<string, unknown> | null;
}

// anyone can see these, as long as they're an admin: requests for an account belong to
// nobody yet, just like the approvals list
const FOR_EVERY_ADMIN: AuditAction[] = ['account.signed_up', 'account.rejected'];

/**
 * the audit trail (adr 0018). events are written in the same transaction as the change they
 * describe, so there's never a change without its event or an event for a change that didn't
 * happen. the table is append only: nothing can change or delete what's in it
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly db: DatabaseService,
    private readonly hierarchy: HierarchyService,
  ) {}

  /** the subject and everyone above them, right now. stored with the event */
  async chainOf(employeeId: string, tx: Prisma.TransactionClient): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE chain AS (
        SELECT e.id, e.manager_id FROM employees e WHERE e.id = ${employeeId}::uuid
        UNION
        SELECT e.id, e.manager_id FROM employees e JOIN chain c ON e.id = c.manager_id
      )
      SELECT id FROM chain`);
    return rows.map((row) => row.id);
  }

  /** writes an event. call it inside the transaction making the change */
  async record(tx: Prisma.TransactionClient, event: NewEvent) {
    const scope =
      event.scope ?? (event.subject ? await this.chainOf(event.subject.employeeId, tx) : []);
    await tx.auditEvent.create({
      data: {
        action: event.action,
        actorAccountId: event.actor?.accountId ?? null,
        actorEmployeeId: event.actor?.employeeId ?? null,
        actorName: event.actor?.name ?? null,
        subjectEmployeeId: event.subject?.employeeId ?? null,
        subjectName: event.subject?.name ?? null,
        scope,
        changes: (event.changes as Prisma.InputJsonValue) ?? Prisma.DbNull,
        details: (event.details as Prisma.InputJsonValue) ?? Prisma.DbNull,
        requestId: currentRequestId() ?? null,
      },
    });
  }

  /**
   * what an admin can see: events about people who were below them when it happened, events
   * about themselves, and requests for accounts. someone at the top sees everything. anyone
   * who can see an event was above that person at the time, so salary changes stay private
   */
  async list(admin: SignedInAccount, q: AuditQuery): Promise<Paginated<AuditEvent>> {
    const atTop = await this.hierarchy.isAtTop(admin.employeeId);
    const where: Prisma.AuditEventWhereInput = {
      AND: [
        atTop
          ? {}
          : { OR: [{ scope: { has: admin.employeeId } }, { action: { in: FOR_EVERY_ADMIN } }] },
        q.action ? { action: q.action } : {},
        q.employeeId
          ? { OR: [{ subjectEmployeeId: q.employeeId }, { actorEmployeeId: q.employeeId }] }
          : {},
      ],
    };
    const [rows, total] = await this.db.$transaction([
      this.db.auditEvent.findMany({
        where,
        orderBy: [{ at: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.db.auditEvent.count({ where }),
    ]);
    return { items: rows.map(toEvent), total, page: q.page, pageSize: q.pageSize };
  }
}

const toEvent = (row: AuditRow): AuditEvent => ({
  id: row.id,
  at: row.at.toISOString(),
  action: row.action as AuditAction,
  actor: row.actorName ? { employeeId: row.actorEmployeeId, name: row.actorName } : null,
  subject: row.subjectName ? { employeeId: row.subjectEmployeeId, name: row.subjectName } : null,
  changes: (row.changes as AuditEvent['changes']) ?? null,
  details: (row.details as AuditEvent['details']) ?? null,
  requestId: row.requestId,
});
