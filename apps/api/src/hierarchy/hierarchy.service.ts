import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

/** questions about who sits where, answered by walking the manager links in the database */
@Injectable()
export class HierarchyService {
  constructor(private readonly db: DatabaseService) {}

  /** true when `employeeId` is somewhere in `managerId`'s team, at any depth (not themselves) */
  async isBelow(managerId: string, employeeId: string, tx: Prisma.TransactionClient = this.db) {
    if (managerId === employeeId) return false;
    const rows = await tx.$queryRaw<{ below: boolean }[]>(Prisma.sql`
      WITH RECURSIVE chain AS (
        SELECT e.id, e.manager_id FROM employees e WHERE e.id = ${employeeId}::uuid
        UNION
        SELECT e.id, e.manager_id FROM employees e JOIN chain c ON e.id = c.manager_id
      )
      SELECT EXISTS (SELECT 1 FROM chain WHERE id = ${managerId}::uuid AND id <> ${employeeId}::uuid) AS below`);
    return rows[0]?.below ?? false;
  }

  /** everyone in `managerId`'s team at any depth, not including them */
  async idsBelow(managerId: string, tx: Prisma.TransactionClient = this.db): Promise<Set<string>> {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE team AS (
        SELECT e.id FROM employees e WHERE e.manager_id = ${managerId}::uuid
        UNION
        SELECT e.id FROM employees e JOIN team t ON e.manager_id = t.id
      )
      SELECT id FROM team`);
    return new Set(rows.map((row) => row.id));
  }

  /** has no manager, like the ceo */
  async isAtTop(employeeId: string, tx: Prisma.TransactionClient = this.db): Promise<boolean> {
    const row = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });
    return row !== null && row.managerId === null;
  }

  /**
   * holds the same lock the database trigger takes for manager changes, until the transaction
   * ends. while we hold it nobody can move anyone, so "is this person below me" stays true
   * between checking it and saving the change
   */
  async lockReportingLines(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hierarchy_hub.employees.reporting_lines'))`;
  }
}
