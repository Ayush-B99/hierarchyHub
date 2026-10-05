import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { EmployeeSortField, ListEmployeesQuery } from '@hierarchy-hub/shared';
import { DatabaseService } from '../database/database.service';
import type { ExpectedVersion } from '../common/if-match';
import type { EmployeeRecord } from './employee.mapper';

// every column we're allowed to sort by, mapped to fixed sql. user input only ever picks a key
// from this list, it never becomes part of the sql itself. text sorts ignore capitals
const SORT_SQL: Record<EmployeeSortField, Prisma.Sql> = {
  employeeNumber: Prisma.sql`e.employee_number`,
  firstName: Prisma.sql`lower(e.first_name)`,
  lastName: Prisma.sql`lower(e.last_name)`,
  email: Prisma.sql`e.email`,
  birthDate: Prisma.sql`e.birth_date`,
  salary: Prisma.sql`e.salary`,
  role: Prisma.sql`lower(e.role)`,
  managerName: Prisma.sql`lower(m.last_name)`,
  createdAt: Prisma.sql`e.created_at`,
};

/** % and _ mean "anything" in a like pattern, so escape them to search for them literally */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

interface ListRow extends EmployeeRecord {
  total: number;
}

/** the only place that knows how employees are stored (repository pattern, see sas section 10) */
@Injectable()
export class EmployeesRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * one page of employees with filters, sorting and the total count in a single query
   * written as sql (always through Prisma.sql, so every value is a parameter) because prisma
   * can't sort by the manager's name with "no manager first", or ignore capitals when sorting
   */
  async list(q: ListEmployeesQuery): Promise<{ rows: EmployeeRecord[]; total: number }> {
    const where: Prisma.Sql[] = [];
    if (q.search) {
      const term = `%${escapeLike(q.search)}%`;
      where.push(Prisma.sql`(
        e.first_name ILIKE ${term} ESCAPE '\\' OR e.last_name ILIKE ${term} ESCAPE '\\'
        OR (e.first_name || ' ' || e.last_name) ILIKE ${term} ESCAPE '\\'
        OR e.email ILIKE ${term} ESCAPE '\\' OR e.employee_number ILIKE ${term} ESCAPE '\\'
        OR e.role ILIKE ${term} ESCAPE '\\'
      )`);
    }
    if (q.role) where.push(Prisma.sql`lower(e.role) = lower(${q.role})`);
    if (q.managerId) where.push(Prisma.sql`e.manager_id = ${q.managerId}::uuid`);
    if (q.salaryMin !== undefined) where.push(Prisma.sql`e.salary >= ${q.salaryMin}`);
    if (q.salaryMax !== undefined) where.push(Prisma.sql`e.salary <= ${q.salaryMax}`);
    if (q.bornAfter) where.push(Prisma.sql`e.birth_date >= ${q.bornAfter}::date`);
    if (q.bornBefore) where.push(Prisma.sql`e.birth_date <= ${q.bornBefore}::date`);

    const whereSql = where.length ? Prisma.sql`WHERE ${Prisma.join(where, ' AND ')}` : Prisma.empty;
    const direction = q.sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    // people with no manager come first when sorting by manager a to z, and last z to a
    const nulls =
      q.sortBy === 'managerName'
        ? q.sortOrder === 'desc'
          ? Prisma.sql`NULLS LAST`
          : Prisma.sql`NULLS FIRST`
        : Prisma.empty;
    const managerFirstName =
      q.sortBy === 'managerName' ? Prisma.sql`, lower(m.first_name) ${direction}` : Prisma.empty;

    const rows = await this.db.$queryRaw<ListRow[]>`
      SELECT
        e.id, e.employee_number AS "employeeNumber", e.first_name AS "firstName", e.last_name AS "lastName",
        e.email, e.birth_date AS "birthDate", e.salary, e.role, e.manager_id AS "managerId", e.version,
        e.created_at AS "createdAt", e.updated_at AS "updatedAt",
        -- the total across every page, as a plain int (count() is a bigint, which json can't handle)
        (count(*) OVER ())::int AS total
      FROM employees e
      LEFT JOIN employees m ON m.id = e.manager_id
      ${whereSql}
      -- the tie breakers keep the order stable, so nobody shows up on two pages
      ORDER BY ${SORT_SQL[q.sortBy]} ${direction} ${nulls}${managerFirstName},
        lower(e.last_name), lower(e.first_name), e.id
      LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`;

    if (rows.length > 0) return { rows, total: rows[0]?.total ?? 0 };
    // past the last page there are no rows to read the total from, so count separately
    const [counted] = await this.db.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS total FROM employees e ${whereSql}`;
    return { rows: [], total: counted?.total ?? 0 };
  }

  /** everyone, for drawing the org chart in one go */
  everyone(): Promise<EmployeeRecord[]> {
    return this.db.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: string): Promise<EmployeeRecord | null> {
    return this.db.employee.findUnique({ where: { id } });
  }

  create(data: Prisma.EmployeeUncheckedCreateInput): Promise<EmployeeRecord> {
    return this.db.employee.create({ data });
  }

  /**
   * saves a change only if the row is still at the version the user loaded. the check and
   * the save are one statement, so there's no gap for someone else's edit to slip into
   * returns null when nothing matched (gone, or changed by someone else)
   */
  async updateIfVersion(
    id: string,
    expected: ExpectedVersion,
    data: Prisma.EmployeeUncheckedUpdateInput,
  ): Promise<EmployeeRecord | null> {
    try {
      return await this.db.employee.update({
        where: { id, version: expected },
        data,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return null;
      throw error;
    }
  }

  /**
   * deletes someone and moves their direct reports up to their own manager (br-04),
   * all in one transaction so it either fully happens or doesn't happen at all
   */
  deleteMovingTeamUp(
    id: string,
    expected: ExpectedVersion,
  ): Promise<{ result: 'missing' } | { result: 'stale' } | { result: 'deleted'; moved: number }> {
    return this.db.$transaction(async (tx) => {
      // lock their row first, so nobody can edit them or give them a new report mid way
      const [row] = await tx.$queryRaw<{ managerId: string | null; version: number }[]>`
        SELECT manager_id AS "managerId", version FROM employees WHERE id = ${id}::uuid FOR UPDATE`;
      if (!row) return { result: 'missing' as const };
      if (row.version !== expected) return { result: 'stale' as const };

      const moved = await tx.employee.updateMany({
        where: { managerId: id },
        data: { managerId: row.managerId },
      });
      await tx.employee.delete({ where: { id } });
      return { result: 'deleted' as const, moved: moved.count };
    });
  }
}
