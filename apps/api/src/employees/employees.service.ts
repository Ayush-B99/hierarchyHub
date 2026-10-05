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
  ) {}

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
      return this.repository.create(toCreateData(input), tx);
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
      return this.repository.updateIfVersion(id, expected, toUpdateData(input), tx);
    });
    if (row) return toEmployee(row);
    throw changedBySomeoneElse();
  }

  /** admins only (checked by the guard), and only people below them */
  async remove(viewer: SignedInAccount, id: string, expected: ExpectedVersion): Promise<number> {
    const outcome = await this.repository.deleteMovingTeamUp(id, expected, async (tx) => {
      await this.org.lockReportingLines(tx);
      if (!(await this.repository.findById(id, tx))) return;
      if (!(await this.org.isBelow(viewer.employeeId, id, tx))) throw refused(OUT_OF_REACH);
    });
    if (outcome.result === 'missing') throw new NotFoundException('Employee not found');
    if (outcome.result === 'stale') throw changedBySomeoneElse();
    return outcome.moved;
  }
}
