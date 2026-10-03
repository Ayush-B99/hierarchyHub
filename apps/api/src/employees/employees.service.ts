import { Injectable, NotFoundException } from '@nestjs/common';
import type { Employee, ListEmployeesQuery, Paginated } from '@hierarchy-hub/shared';
import { toEmployee } from './employee.mapper';
import { EmployeesRepository } from './employees.repository';

/** business logic for employees. reading only for now, changes arrive in part 5b */
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
}
