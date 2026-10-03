import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  listEmployeesQuerySchema,
  type Employee,
  type ListEmployeesQuery,
  type Paginated,
} from '@hierarchy-hub/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EmployeesService } from './employees.service';

// unknown query parameters are refused rather than ignored, so typos get noticed
const listQuery = new ZodValidationPipe(listEmployeesQuerySchema.strict());
const idParam = new ZodValidationPipe(z.string().uuid('That is not a valid employee id'));

/** each employee's etag is its version, which the database bumps on every change */
export const etagFor = (employee: Pick<Employee, 'version'>) => `"v${employee.version}"`;

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@Query(listQuery) query: ListEmployeesQuery): Promise<Paginated<Employee>> {
    return this.employees.list(query);
  }

  /** everyone in one list, the web app builds the org chart from it */
  @Get('hierarchy')
  hierarchy(): Promise<Employee[]> {
    return this.employees.hierarchy();
  }

  @Get(':id')
  async get(
    @Param('id', idParam) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Employee> {
    const employee = await this.employees.get(id);
    // the version as an etag: lets browsers revalidate cheaply now, and guards edits in part 5b
    res.setHeader('ETag', etagFor(employee));
    return employee;
  }
}
