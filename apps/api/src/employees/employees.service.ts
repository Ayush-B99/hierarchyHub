import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateEmployeeInput,
  Employee,
  ListEmployeesQuery,
  Paginated,
  UpdateEmployeeInput,
} from '@hierarchy-hub/shared';
import { changedBySomeoneElse, type ExpectedVersion } from '../common/if-match';
import { toCreateData, toEmployee, toUpdateData } from './employee.mapper';
import { EmployeesRepository } from './employees.repository';

/**
 * business logic for employees. the rules themselves (no self management, no loops, unique
 * email and number) are enforced by the database (adr 0010), so they hold even under clashing
 * requests. this layer adds the version checks and turns "nothing matched" into 404 or 412
 */
@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  async list(query: ListEmployeesQuery): Promise<Paginated<Employee>> {
    const { rows, total } = await this.repository.list(query);
    return { items: rows.map(toEmployee), total, page: query.page, pageSize: query.pageSize };
  }

  async hierarchy(): Promise<Employee[]> {
    return (await this.repository.everyone()).map(toEmployee);
  }

  async get(id: string): Promise<Employee> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException('Employee not found');
    return toEmployee(row);
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    return toEmployee(await this.repository.create(toCreateData(input)));
  }

  async update(
    id: string,
    input: UpdateEmployeeInput,
    expected: ExpectedVersion,
  ): Promise<Employee> {
    const row = await this.repository.updateIfVersion(id, expected, toUpdateData(input));
    if (row) return toEmployee(row);
    // nothing matched: either they're gone, or someone else saved first
    if (!(await this.repository.findById(id))) throw new NotFoundException('Employee not found');
    throw changedBySomeoneElse();
  }

  /** returns how many direct reports moved up to the deleted employee's manager */
  async remove(id: string, expected: ExpectedVersion): Promise<number> {
    const outcome = await this.repository.deleteMovingTeamUp(id, expected);
    if (outcome.result === 'missing') throw new NotFoundException('Employee not found');
    if (outcome.result === 'stale') throw changedBySomeoneElse();
    return outcome.moved;
  }
}
