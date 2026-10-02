import { z } from 'zod';

/**
 * The employee contract. Used by the web forms, the mock API and the real API,
 * so all three always agree on what a valid employee is. See docs/srs/SRS.md section 6.
 */

const name = z.string().trim().min(1, 'Required').max(100, 'Keep it under 100 characters');

export const employeeInputSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(20, 'Keep it under 20 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only'),
  firstName: name,
  lastName: name,
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date')
    .refine((value) => new Date(value) < new Date(), 'Birth date must be in the past'),
  salary: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Salary cannot be negative')
    .max(1_000_000_000, 'That salary looks too high')
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
      'Use at most two decimal places',
    ),
  role: name,
  managerId: z.string().uuid().nullable().optional(),
});

export const createEmployeeSchema = employeeInputSchema;
export const updateEmployeeSchema = employeeInputSchema.partial();

export const EMPLOYEE_SORT_FIELDS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'email',
  'birthDate',
  'salary',
  'role',
  // sorts by the manager's surname, top level people (no manager) come first
  'managerName',
  'createdAt',
] as const;

export const listEmployeesQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  managerId: z.string().uuid().optional(),
  salaryMin: z.coerce.number().nonnegative().optional(),
  salaryMax: z.coerce.number().nonnegative().optional(),
  bornAfter: z.string().optional(),
  bornBefore: z.string().optional(),
  sortBy: z.enum(EMPLOYEE_SORT_FIELDS).default('lastName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];

/** An employee as returned by the API. Dates are ISO strings. */
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  salary: number;
  role: string;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Error body returned by the API for every failed request. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}
