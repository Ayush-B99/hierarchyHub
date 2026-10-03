import type { Employee } from '@hierarchy-hub/shared';

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
