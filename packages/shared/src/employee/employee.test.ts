import { describe, expect, it } from 'vitest';
import { createEmployeeSchema } from './employee';

const valid = {
  employeeNumber: 'EMP-0100',
  firstName: 'Thandi',
  lastName: 'Nkosi',
  email: 'Thandi.Nkosi@Example.com',
  birthDate: '1985-04-12',
  salary: '125000.50',
  role: 'Chief Executive Officer',
  managerId: null,
};

describe('createEmployeeSchema', () => {
  it('accepts a valid employee and normalises it', () => {
    const result = createEmployeeSchema.parse(valid);
    expect(result.email).toBe('thandi.nkosi@example.com');
    expect(result.salary).toBe(125000.5);
    expect(
      createEmployeeSchema.parse({ ...valid, employeeNumber: 'emp-0100' }).employeeNumber,
    ).toBe('EMP-0100');
  });

  it('rejects a birth date in the future', () => {
    const result = createEmployeeSchema.safeParse({ ...valid, birthDate: '2999-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative salary', () => {
    const result = createEmployeeSchema.safeParse({ ...valid, salary: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects more than two decimal places in salary', () => {
    const result = createEmployeeSchema.safeParse({ ...valid, salary: 10.555 });
    expect(result.success).toBe(false);
  });

  it('rejects an employee number with spaces', () => {
    const result = createEmployeeSchema.safeParse({ ...valid, employeeNumber: 'EMP 1' });
    expect(result.success).toBe(false);
  });
});
