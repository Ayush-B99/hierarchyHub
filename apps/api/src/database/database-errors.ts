import { HttpStatus } from '@nestjs/common';

/** what the api tells the browser, matching docs/api/API.md */
export interface MappedError {
  status: HttpStatus;
  message: string;
  /** puts the message next to a form field when it belongs to one */
  field?: string;
  /** short name for logs, never contains personal data */
  rule: string;
}

// one friendly message per database rule (see the migration and adr 0010)
const RULES: Record<string, Omit<MappedError, 'rule'>> = {
  employees_not_own_manager: {
    status: HttpStatus.BAD_REQUEST,
    message: "An employee can't be their own manager",
    field: 'managerId',
  },
  employees_no_reporting_loop: {
    status: HttpStatus.BAD_REQUEST,
    message: "This person reports to the employee you're editing, so they can't be their manager",
    field: 'managerId',
  },
  employees_salary_not_negative: {
    status: HttpStatus.BAD_REQUEST,
    message: "Salary can't be negative",
    field: 'salary',
  },
  employees_birth_date_in_past: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Birth date must be in the past',
    field: 'birthDate',
  },
  employees_birth_date_realistic: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Birth date must be after 1900',
    field: 'birthDate',
  },
  employees_names_not_blank: {
    status: HttpStatus.BAD_REQUEST,
    message: "Names and role can't be blank",
  },
  employees_email_format: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Enter a valid email address',
    field: 'email',
  },
  employees_number_format: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Use letters, numbers and dashes only',
    field: 'employeeNumber',
  },
  employees_id_fixed: {
    status: HttpStatus.BAD_REQUEST,
    message: "An employee's id can't be changed",
  },
};

// the trigger raises its own text rather than a constraint name, so match those here
const TRIGGER_MESSAGES: Record<string, string> = {
  'this change would create a reporting loop': 'employees_no_reporting_loop',
  'birth date must be in the past': 'employees_birth_date_in_past',
  "an employee id can't be changed": 'employees_id_fixed',
};

const UNAVAILABLE: MappedError = {
  status: HttpStatus.SERVICE_UNAVAILABLE,
  message: 'The database is unavailable right now. Please try again shortly.',
  rule: 'database_unavailable',
};

const BUSY: MappedError = {
  status: HttpStatus.SERVICE_UNAVAILABLE,
  message: 'The database is busy right now. Please try again.',
  rule: 'database_busy',
};

interface Cause {
  originalCode?: string;
  originalMessage?: string;
  code?: string;
  kind?: string;
  constraint?: { fields?: string[]; index?: string };
}

// prisma wraps driver errors in a couple of different ways, this digs out the postgres part
function causeOf(error: unknown): Cause | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { cause?: Cause; meta?: { driverAdapterError?: { cause?: Cause } } };
  return e.meta?.driverAdapterError?.cause ?? e.cause;
}

function codeOf(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/**
 * turns a database error into something safe to send to the browser
 * returns null for anything we don't recognise, those become a plain 500
 *
 * note: postgres errors can include a "failing row contains ..." detail with salaries and
 * birth dates in it. nothing from the detail is ever copied into the result, only rule names
 */
export function mapDatabaseError(error: unknown): MappedError | null {
  const prismaCode = codeOf(error);
  const cause = causeOf(error);
  const pgCode = cause?.originalCode ?? cause?.code;
  const message = cause?.originalMessage ?? '';

  // can't reach the database at all
  if (
    prismaCode === 'P1001' ||
    prismaCode === 'P1002' ||
    prismaCode === 'P1017' ||
    cause?.kind === 'DatabaseNotReachable'
  ) {
    return UNAVAILABLE;
  }
  // our own time limits from roles.sql: statement_timeout (57014) and lock_timeout (55P03)
  if (pgCode === '57014' || pgCode === '55P03') return BUSY;

  // unique email or employee number (br-05)
  if (prismaCode === 'P2002' || pgCode === '23505') {
    const fields = cause?.constraint?.fields ?? [];
    if (fields.includes('email') || message.includes('employees_email_key')) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Another employee already has that email address',
        field: 'email',
        rule: 'employees_email_key',
      };
    }
    return {
      status: HttpStatus.CONFLICT,
      message: 'Another employee already has that employee number',
      field: 'employeeNumber',
      rule: 'employees_employee_number_key',
    };
  }

  // the manager link: either deleting someone who still has a team, or pointing at a manager that doesn't exist
  if (prismaCode === 'P2003' || pgCode === '23503') {
    if (message.startsWith('update or delete')) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'People still report to this employee. Move them to a new manager first.',
        rule: 'employees_manager_id_fkey_delete',
      };
    }
    return {
      status: HttpStatus.NOT_FOUND,
      message: 'That manager no longer exists',
      field: 'managerId',
      rule: 'employees_manager_id_fkey',
    };
  }

  // update or delete of a row that isn't there
  if (prismaCode === 'P2025') {
    return { status: HttpStatus.NOT_FOUND, message: 'Employee not found', rule: 'not_found' };
  }

  // check rules and the trigger
  if (pgCode === '23514') {
    const fromCheck = /check constraint "([a-z_]+)"/.exec(message)?.[1];
    const rule = fromCheck ?? TRIGGER_MESSAGES[message];
    const known = rule ? RULES[rule] : undefined;
    if (rule && known) return { ...known, rule };
    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'That change breaks one of the data rules',
      rule: 'check_violation',
    };
  }

  return null;
}
