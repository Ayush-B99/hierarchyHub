import { Prisma } from '@prisma/client';
import type { CreateEmployeeInput, Employee, UpdateEmployeeInput } from '@hierarchy-hub/shared';

/** the columns we read, whether they came through prisma's client or a raw query */
export interface EmployeeRecord {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date;
  salary: { toString(): string };
  role: string;
  managerId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * database row -> what the api sends (docs/api/API.md)
 * dates become strings, and the exact decimal salary becomes a plain number. salaries are
 * capped at a billion with 2 decimals, which a js number holds exactly
 */
export function toEmployee(row: EmployeeRecord): Employee {
  return {
    id: row.id,
    employeeNumber: row.employeeNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    // stored as a date with no time, read back as midnight utc, so slicing is safe in any time zone
    birthDate: row.birthDate.toISOString().slice(0, 10),
    salary: Number(row.salary.toString()),
    role: row.role,
    managerId: row.managerId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** "1990-05-01" -> midnight utc on that day, how the database's date column round trips */
const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
/** exact decimal from the validated number, never a float, so cents can't drift */
const toSalary = (amount: number) => new Prisma.Decimal(amount.toFixed(2));

/** checked input -> what prisma needs to add an employee */
export function toCreateData(input: CreateEmployeeInput): Prisma.EmployeeUncheckedCreateInput {
  return {
    employeeNumber: input.employeeNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    birthDate: toDate(input.birthDate),
    salary: toSalary(input.salary),
    role: input.role,
    managerId: input.managerId ?? null,
  };
}

/** only the fields that were sent, so a change never touches anything else */
export function toUpdateData(input: UpdateEmployeeInput): Prisma.EmployeeUncheckedUpdateInput {
  const data: Prisma.EmployeeUncheckedUpdateInput = {};
  if (input.employeeNumber !== undefined) data.employeeNumber = input.employeeNumber;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email;
  if (input.birthDate !== undefined) data.birthDate = toDate(input.birthDate);
  if (input.salary !== undefined) data.salary = toSalary(input.salary);
  if (input.role !== undefined) data.role = input.role;
  // null is meaningful here: it makes them top level
  if (input.managerId !== undefined) data.managerId = input.managerId;
  return data;
}
