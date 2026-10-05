import { z } from 'zod';

/**
 * The employee contract. Used by the web forms, the mock API and the real API,
 * so all three always agree on what a valid employee is. See docs/srs/SRS.md section 6.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** the youngest anyone can be employed in south africa (basic conditions of employment act) */
export const MIN_AGE = 15;

/** true for a date that exists on the calendar, so 2026-02-30 and 2026-13-01 are refused */
export function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** today minus the minimum age, as yyyy-mm-dd. anyone born after this is too young */
export function latestBirthDate(today = new Date()): string {
  const limit = new Date(
    Date.UTC(today.getUTCFullYear() - MIN_AGE, today.getUTCMonth(), today.getUTCDate()),
  );
  return limit.toISOString().slice(0, 10);
}

const isoDate = z
  .string()
  .regex(ISO_DATE, 'Use YYYY-MM-DD')
  .refine(isRealDate, "That date doesn't exist");

// control characters (eg a NUL byte) and invisible formatting characters (zero width spaces,
// right to left overrides) let someone make a name look blank or spoof another one
const HIDDEN_CHARACTERS = /[\p{Cc}\p{Cf}]/u;
const noHiddenCharacters = (value: string) => !HIDDEN_CHARACTERS.test(value);
const HIDDEN_MESSAGE = 'Remove hidden or control characters';

const name = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(100, 'Keep it under 100 characters')
  .refine(noHiddenCharacters, HIDDEN_MESSAGE);

/**
 * salary as a number. numbers typed into the form arrive as text, so text like "72000" is
 * turned into a number, but blank text, null and true/false are refused rather than
 * quietly becoming 0 or 1
 */
const salary = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
  z
    .number({ invalid_type_error: 'Enter a number', required_error: 'Required' })
    .finite('Enter a number')
    .nonnegative('Salary cannot be negative')
    .max(1_000_000_000, 'That salary looks too high')
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
      'Use at most two decimal places',
    ),
);

export const employeeInputSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, 'Required')
    .max(20, 'Keep it under 20 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only')
    // stored upper case so "emp-1" and "EMP-1" count as the same number (the database checks this too)
    .transform((value) => value.toUpperCase()),
  firstName: name,
  lastName: name,
  email: z
    .string()
    .trim()
    .toLowerCase()
    // the longest an email address can be (rfc 5321)
    .max(254, 'Keep it under 254 characters')
    .email('Enter a valid email address')
    .refine(noHiddenCharacters, HIDDEN_MESSAGE),
  birthDate: isoDate
    .refine((value) => value >= '1900-01-01', 'Birth date must be after 1900')
    // checked at the moment of saving, so it uses today's date then (the database checks this too)
    .refine(
      (value) => value <= latestBirthDate(),
      `Employees must be at least ${MIN_AGE} years old`,
    ),
  salary,
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

const filterText = z
  .string()
  .trim()
  .max(100, 'Keep it under 100 characters')
  .refine(noHiddenCharacters, HIDDEN_MESSAGE);

/**
 * the list filters. unknown parameters are refused (strict), and ranges that can never match
 * anyone, like a minimum salary above the maximum, are refused instead of quietly returning
 * nothing
 */
export const listEmployeesQuerySchema = z
  .object({
    search: filterText.optional(),
    role: filterText.optional(),
    managerId: z.string().uuid().optional(),
    salaryMin: z.coerce.number().finite().nonnegative().optional(),
    salaryMax: z.coerce.number().finite().nonnegative().optional(),
    bornAfter: isoDate.optional(),
    bornBefore: isoDate.optional(),
    sortBy: z.enum(EMPLOYEE_SORT_FIELDS).default('lastName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    // far past any real organisation, it just stops absurd numbers overflowing the offset
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(25),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (q.salaryMin !== undefined && q.salaryMax !== undefined && q.salaryMin > q.salaryMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salaryMin'],
        message: 'The minimum salary is above the maximum',
      });
    }
    if (q.bornAfter && q.bornBefore && q.bornAfter > q.bornBefore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bornAfter'],
        message: 'The earliest birth date is after the latest',
      });
    }
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
  /** goes up by one on every change, sent back when saving so clashing edits are caught */
  version: number;
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
