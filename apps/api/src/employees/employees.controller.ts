import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type Employee,
  type ListEmployeesQuery,
  type Paginated,
  type UpdateEmployeeInput,
} from '@hierarchy-hub/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { expectedVersion } from '../common/if-match';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { SignedInAccount } from '../auth/auth.types';
import { AdminOnly, CurrentAccount } from '../auth/decorators';
import { EmployeesService } from './employees.service';

// unknown query parameters and body fields are refused rather than ignored, so typos get
// noticed and nobody can slip in fields like id or version
// already strict, and it checks the ranges make sense
const listQuery = new ZodValidationPipe(listEmployeesQuerySchema);
const idParam = new ZodValidationPipe(z.string().uuid('That is not a valid employee id'));
const createBody = new ZodValidationPipe(createEmployeeSchema.strict());
const updateBody = new ZodValidationPipe(
  updateEmployeeSchema
    .strict()
    .refine((body) => Object.keys(body).length > 0, 'Send at least one field to change'),
);

/** each employee's etag is its version, which the database bumps on every change */
export const etagFor = (employee: Pick<Employee, 'version'>) => `"v${employee.version}"`;

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(
    @CurrentAccount() viewer: SignedInAccount,
    @Query(listQuery) query: ListEmployeesQuery,
  ): Promise<Paginated<Employee>> {
    return this.employees.list(viewer, query);
  }

  /** everyone in one list, the web app builds the org chart from it */
  @Get('hierarchy')
  hierarchy(@CurrentAccount() viewer: SignedInAccount): Promise<Employee[]> {
    return this.employees.hierarchy(viewer);
  }

  @Get(':id')
  async get(
    @CurrentAccount() viewer: SignedInAccount,
    @Param('id', idParam) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Employee> {
    const employee = await this.employees.get(viewer, id);
    // the version as an etag: lets browsers revalidate cheaply, and guards edits below
    res.setHeader('ETag', etagFor(employee));
    return employee;
  }

  @Post()
  // admins only, and only within their part of the organisation (adr 0017)
  @AdminOnly()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentAccount() viewer: SignedInAccount,
    @Body(createBody) body: CreateEmployeeInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Employee> {
    const employee = await this.employees.create(viewer, body);
    res.setHeader('ETag', etagFor(employee));
    res.setHeader('Location', `/api/employees/${employee.id}`);
    return employee;
  }

  /** a partial change. If-Match must carry the version you loaded, or it's refused (412 or 428) */
  @Patch(':id')
  // anyone signed in, the service decides who may change whom (adr 0017)
  async update(
    @CurrentAccount() viewer: SignedInAccount,
    @Param('id', idParam) id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body(updateBody) body: UpdateEmployeeInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Employee> {
    const employee = await this.employees.update(viewer, id, body, expectedVersion(ifMatch));
    res.setHeader('ETag', etagFor(employee));
    return employee;
  }

  /** their direct reports move up to their manager (br-04). needs If-Match too */
  @Delete(':id')
  // admins only, and only within their part of the organisation (adr 0017)
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentAccount() viewer: SignedInAccount,
    @Param('id', idParam) id: string,
    @Headers('if-match') ifMatch: string | undefined,
  ): Promise<void> {
    await this.employees.remove(viewer, id, expectedVersion(ifMatch));
  }
}
