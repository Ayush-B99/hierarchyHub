import { Injectable } from '@nestjs/common';
import { toOrgChange, type OrgChange, type OrgChangeAction } from '@hierarchy-hub/shared';
import { DatabaseService } from '../database/database.service';

const ACTIONS: OrgChangeAction[] = ['employee.created', 'employee.updated', 'employee.deleted'];
const LIMIT = 5000;

@Injectable()
export class HistoryService {
  constructor(private readonly db: DatabaseService) {}

  async list(): Promise<OrgChange[]> {
    const rows = await this.db.auditEvent.findMany({
      where: { action: { in: ACTIONS }, subjectEmployeeId: { not: null } },
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      take: LIMIT,
    });
    const changes = rows.map((row) =>
      toOrgChange({
        id: row.id,
        at: row.at.toISOString(),
        action: row.action,
        subjectEmployeeId: row.subjectEmployeeId,
        subjectName: row.subjectName,
        changes: row.changes,
        details: row.details,
      }),
    );
    return changes.filter(
      (change) => change.action !== 'employee.updated' || Object.keys(change.changes).length > 0,
    );
  }
}
