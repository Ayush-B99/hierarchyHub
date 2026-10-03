import {
  createEmployeeSchema,
  type CreateEmployeeInput,
  type Employee,
  type UpdateEmployeeInput,
} from '@hierarchy-hub/shared';

/** what the form holds while you type, everything is a string until it's checked */
export interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  birthDate: string;
  salary: string;
  role: string;
  /** empty string means no manager */
  managerId: string;
}

export type FieldName = keyof FormValues;
export type FormErrors = Partial<Record<FieldName, string>>;

export const EMPTY_VALUES: FormValues = {
  firstName: '',
  lastName: '',
  email: '',
  employeeNumber: '',
  birthDate: '',
  salary: '',
  role: '',
  managerId: '',
};

// the order fields appear in, so we can jump to the first one with a problem
export const FIELD_ORDER: FieldName[] = [
  'firstName',
  'lastName',
  'email',
  'employeeNumber',
  'birthDate',
  'salary',
  'role',
  'managerId',
];

// friendlier than a bare "required"
const EMPTY_MESSAGES: Partial<Record<FieldName, string>> = {
  firstName: 'Enter a first name',
  lastName: 'Enter a surname',
  email: 'Enter an email address',
  employeeNumber: 'Enter an employee number',
  birthDate: 'Enter a birth date',
  salary: 'Enter a salary',
  role: 'Enter a role, eg Software Engineer',
};

export function valuesFrom(employee: Employee): FormValues {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    employeeNumber: employee.employeeNumber,
    birthDate: employee.birthDate.slice(0, 10),
    salary: String(employee.salary),
    role: employee.role,
    managerId: employee.managerId ?? '',
  };
}

/**
 * checks the form with the same shared rules the api uses (adr 0005)
 * gives back either clean data ready to send, or a message per field
 */
export function validate(values: FormValues): { data?: CreateEmployeeInput; errors: FormErrors } {
  const errors: FormErrors = {};
  for (const [field, message] of Object.entries(EMPTY_MESSAGES) as [FieldName, string][]) {
    if (values[field].trim() === '') errors[field] = message;
  }

  const result = createEmployeeSchema.safeParse({ ...values, managerId: values.managerId || null });
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Partial<Record<FieldName, string[]>>;
    for (const field of FIELD_ORDER) {
      // the "enter a ..." message wins over the schema's generic one
      if (!errors[field] && fieldErrors[field]?.[0]) errors[field] = fieldErrors[field]?.[0];
    }
  }

  if (Object.keys(errors).length > 0 || !result.success) return { errors };
  return { data: result.data, errors };
}

/** only the fields that actually changed, so an edit doesn't overwrite more than it needs to */
export function changedFields(original: Employee, data: CreateEmployeeInput): UpdateEmployeeInput {
  const changes: UpdateEmployeeInput = {};
  if (data.firstName !== original.firstName) changes.firstName = data.firstName;
  if (data.lastName !== original.lastName) changes.lastName = data.lastName;
  if (data.email !== original.email) changes.email = data.email;
  if (data.employeeNumber !== original.employeeNumber) changes.employeeNumber = data.employeeNumber;
  if (data.birthDate !== original.birthDate.slice(0, 10)) changes.birthDate = data.birthDate;
  if (data.salary !== original.salary) changes.salary = data.salary;
  if (data.role !== original.role) changes.role = data.role;
  if ((data.managerId ?? null) !== original.managerId) changes.managerId = data.managerId ?? null;
  return changes;
}

/** server field errors come back as arrays, the form only shows the first one */
export function fromServerErrors(fieldErrors: Record<string, string[]>): FormErrors {
  const errors: FormErrors = {};
  for (const field of FIELD_ORDER) {
    const first = fieldErrors[field]?.[0];
    if (first) errors[field] = first;
  }
  return errors;
}
