import { describe, expect, it } from 'vitest';
import {
  createEmployeeSchema,
  isRealDate,
  latestBirthDate,
  listEmployeesQuerySchema,
} from './employee';

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

describe('dates', () => {
  it('knows which dates exist', () => {
    expect(isRealDate('2024-02-29')).toBe(true);
    expect(isRealDate('2023-02-29')).toBe(false);
    expect(isRealDate('1990-02-30')).toBe(false);
    expect(isRealDate('1990-13-01')).toBe(false);
    expect(isRealDate('1990-1-1')).toBe(false);
  });

  it('works out the latest birth date for someone who is 15 today', () => {
    expect(latestBirthDate(new Date('2026-10-05T10:00:00Z'))).toBe('2011-10-05');
  });

  it('refuses anyone younger than 15, and accepts someone who turns 15 today', () => {
    const fifteen = latestBirthDate();
    const dayAfter = new Date(`${fifteen}T00:00:00Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    expect(createEmployeeSchema.safeParse({ ...valid, birthDate: fifteen }).success).toBe(true);
    expect(
      createEmployeeSchema.safeParse({ ...valid, birthDate: dayAfter.toISOString().slice(0, 10) })
        .success,
    ).toBe(false);
  });
});

describe('salary', () => {
  it.each([null, '', '   ', true, 'abc', 'Infinity'])(
    'refuses %j instead of guessing',
    (salary) => {
      expect(createEmployeeSchema.safeParse({ ...valid, salary }).success).toBe(false);
    },
  );

  it('turns text typed into the form into a number', () => {
    expect(createEmployeeSchema.parse({ ...valid, salary: '72000.50' }).salary).toBe(72000.5);
  });
});

describe('hidden characters', () => {
  it.each([
    ['a NUL byte', 'A\u0000B'],
    ['a right to left override', 'evil\u202Etxt'],
    ['only zero width spaces', '\u200B\u200B'],
    ['a bell character', 'Bell\u0007'],
  ])('refuses %s in a name', (_name, firstName) => {
    expect(createEmployeeSchema.safeParse({ ...valid, firstName }).success).toBe(false);
  });

  it('accepts real names in any language', () => {
    expect(
      createEmployeeSchema.safeParse({ ...valid, firstName: 'Zoë', lastName: 'Ñúñez 李' }).success,
    ).toBe(true);
  });
});

describe('list filters', () => {
  it('refuses ranges that can never match anyone', () => {
    expect(listEmployeesQuerySchema.safeParse({ salaryMin: '5', salaryMax: '1' }).success).toBe(
      false,
    );
    expect(
      listEmployeesQuerySchema.safeParse({ bornAfter: '2000-01-01', bornBefore: '1990-01-01' })
        .success,
    ).toBe(false);
  });

  it('refuses parameters it does not know', () => {
    expect(listEmployeesQuerySchema.safeParse({ isAdmin: 'true' }).success).toBe(false);
  });
});
