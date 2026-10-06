import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  fieldsYouCantChangeAboutYourself,
  type CreateEmployeeInput,
  type Employee,
  type ListEmployeesQuery,
  type Paginated,
  type UpdateEmployeeInput,
} from '@hierarchy-hub/shared';
import type { Prisma } from '@prisma/client';
import type { SignedInAccount } from '../auth/auth.types';
import { changedBySomeoneElse, type ExpectedVersion } from '../common/if-match';
import { actorFrom, AuditService, type NewEvent } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { toCreateData, toEmployee, toUpdateData } from './employee.mapper';
import { EmployeesRepository } from './employees.repository';

const OUT_OF_REACH = 'You can only change people below you in the organisation';
const MANAGER_OUT_OF_REACH = 'You can only choose yourself or someone below you as their manager';
const TOP_ONLY = 'Only someone at the top of the organisation can put people at the top';

/** refused, with the problem shown next to the field it's about */
const refused = (message: string, field?: string) =>
  new ForbiddenException(field ? { message, errors: { [field]: [message] } } : message);

/**
 * business logic for employees. the data rules (no self management, no loops, unique email
 * and number) are enforced by the database (adr 0010). this layer adds who may do what
 * (adr 0017), the version checks, and hides salaries and birth dates from people who aren't
 * allowed to see them
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly repository: EmployeesRepository,
    private readonly org: HierarchyService,
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** a manager as the audit trail keeps them: their id and their name at the time */
  private async managerSnapshot(managerId: string | null, tx: Prisma.TransactionClient) {
    if (!managerId) return null;
    const manager = await this.repository.findById(managerId, tx);
    return { id: managerId, name: manager ? nameOf(manager) : 'someone since deleted' };
  }

  /** each field that's different, as { from, to }, with managers named */
  private async differences(
    before: Employee | null,
    after: Employee,
    tx: Prisma.TransactionClient,
  ): Promise<Record<string, { from: unknown; to: unknown }>> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of AUDITED_FIELDS) {
      const from = before ? before[field] : null;
      if (from === after[field]) continue;
      changes[field] =
        field === 'managerId'
          ? {
              from: await this.managerSnapshot(from as string | null, tx),
              to: await this.managerSnapshot(after.managerId, tx),
            }
          : { from, to: after[field] };
    }
    return changes;
  }

  /** whose salary and birth date this person may see: themselves and everyone below them */
  private async visibleTo(viewer: SignedInAccount): Promise<Set<string>> {
    const team = await this.org.idsBelow(viewer.employeeId);
    team.add(viewer.employeeId);
    return team;
  }

  private shown(employee: Employee, visible: Set<string>): Employee {
    return visible.has(employee.id) ? employee : { ...employee, salary: null, birthDate: null };
  }

  async list(viewer: SignedInAccount, query: ListEmployeesQuery): Promise<Paginated<Employee>> {
    const visible = await this.visibleTo(viewer);
    const usesPrivate =
      query.salaryMin !== undefined ||
      query.salaryMax !== undefined ||
      query.bornAfter !== undefined ||
      query.bornBefore !== undefined ||
      query.sortBy === 'salary' ||
      query.sortBy === 'birthDate';
    const { rows, total } = await this.repository.list(
      query,
      usesPrivate ? [...visible] : undefined,
    );
    return {
      items: rows.map((row) => this.shown(toEmployee(row), visible)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async hierarchy(viewer: SignedInAccount): Promise<Employee[]> {
    const visible = await this.visibleTo(viewer);
    return (await this.repository.everyone()).map((row) => this.shown(toEmployee(row), visible));
  }

  async get(viewer: SignedInAccount, id: string): Promise<Employee> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException('Employee not found');
    return this.shown(toEmployee(row), await this.visibleTo(viewer));
  }

  /**
   * checks the new manager is you or someone below you (or nobody, if you're at the top).
   * run inside the locked transaction, so the answer can't change before the save
   */
  private async checkManager(
    viewer: SignedInAccount,
    managerId: string | null,
    tx: Prisma.TransactionClient,
  ) {
    if (managerId === null) {
      if (!(await this.org.isAtTop(viewer.employeeId, tx))) throw refused(TOP_ONLY, 'managerId');
      return;
    }
    // a manager who doesn't exist is a clearer answer than "not in your reach"
    if (!(await this.repository.findById(managerId, tx))) {
      const message = 'That manager no longer exists';
      throw new NotFoundException({ message, errors: { managerId: [message] } });
    }
    if (
      managerId !== viewer.employeeId &&
      !(await this.org.isBelow(viewer.employeeId, managerId, tx))
    ) {
      throw refused(MANAGER_OUT_OF_REACH, 'managerId');
    }
  }

  /** admins only (checked by the guard), and only into their own part of the organisation */
  async create(viewer: SignedInAccount, input: CreateEmployeeInput): Promise<Employee> {
    const row = await this.db.$transaction(async (tx) => {
      await this.org.lockReportingLines(tx);
      await this.checkManager(viewer, input.managerId ?? null, tx);
      const created = await this.repository.create(toCreateData(input), tx);
      await this.audit.record(tx, {
        action: 'employee.created',
        actor: actorFrom(viewer),
        subject: { employeeId: created.id, name: nameOf(created) },
        changes: await this.differences(null, toEmployee(created), tx),
      });
      return created;
    });
    return toEmployee(row);
  }

  /**
   * about yourself you can only change your name and email. anyone below you, you can change
   * anything, and move them to a manager in your reach. nobody else at all
   */
  async update(
    viewer: SignedInAccount,
    id: string,
    input: UpdateEmployeeInput,
    expected: ExpectedVersion,
  ): Promise<Employee> {
    const row = await this.db.$transaction(async (tx) => {
      await this.org.lockReportingLines(tx);
      const target = await this.repository.findById(id, tx);
      if (!target) throw new NotFoundException('Employee not found');

      if (id === viewer.employeeId) {
        const blocked = fieldsYouCantChangeAboutYourself(input);
        if (blocked.length > 0) {
          const message = 'You can only change your own name and email';
          throw new ForbiddenException({
            message,
            errors: Object.fromEntries(blocked.map((field) => [field, [message]])),
          });
        }
      } else if (!(await this.org.isBelow(viewer.employeeId, id, tx))) {
        throw refused(OUT_OF_REACH);
      }

      if (input.managerId !== undefined) await this.checkManager(viewer, input.managerId, tx);
      const updated = await this.repository.updateIfVersion(id, expected, toUpdateData(input), tx);
      // someone else saved first: nothing changed, so there's nothing to record
      if (!updated) return null;
      const changes = await this.differences(toEmployee(target), toEmployee(updated), tx);
      if (Object.keys(changes).length > 0) {
        await this.audit.record(tx, {
          action: 'employee.updated',
          actor: actorFrom(viewer),
          subject: { employeeId: id, name: nameOf(updated) },
          changes,
        });
      }
      return updated;
    });
    if (row) return toEmployee(row);
    throw changedBySomeoneElse();
  }

  /** admins only (checked by the guard), and only people below them */
  async remove(viewer: SignedInAccount, id: string, expected: ExpectedVersion): Promise<number> {
    // the event is worked out before they're gone, while the people above them can still be
    // read, but only written once the delete has happened. a refused or stale delete leaves
    // no trace in the history, because nothing happened
    let pending: NewEvent | undefined;
    const outcome = await this.repository.deleteMovingTeamUp(
      id,
      expected,
      async (tx) => {
        await this.org.lockReportingLines(tx);
        const row = await this.repository.findById(id, tx);
        if (!row) return;
        if (!(await this.org.isBelow(viewer.employeeId, id, tx))) throw refused(OUT_OF_REACH);
        const before = toEmployee(row);
        const manager = await this.managerSnapshot(before.managerId, tx);
        const teamRows = await tx.employee.findMany({ where: { managerId: id } });
        pending = {
          action: 'employee.deleted',
          actor: actorFrom(viewer),
          subject: { employeeId: id, name: nameOf(row) },
          scope: await this.audit.chainOf(id, tx),
          changes: {
            role: { from: before.role, to: null },
            managerId: { from: manager, to: null },
          },
          details: {
            employeeNumber: before.employeeNumber,
            teamMovedTo: manager,
            team: teamRows.map(nameOf),
            teamIds: teamRows.map((member) => member.id),
            person: {
              id,
              firstName: before.firstName,
              lastName: before.lastName,
              email: before.email,
              employeeNumber: before.employeeNumber,
              role: before.role,
              managerId: before.managerId,
            },
          },
        };
      },
      async (tx) => {
        if (pending) await this.audit.record(tx, pending);
      },
    );
    if (outcome.result === 'missing') throw new NotFoundException('Employee not found');
    if (outcome.result === 'stale') throw changedBySomeoneElse();
    return outcome.moved;
  }
}

const nameOf = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`;

/** the fields whose changes go in the audit trail */
const AUDITED_FIELDS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'email',
  'birthDate',
  'salary',
  'role',
  'managerId',
] as const;
