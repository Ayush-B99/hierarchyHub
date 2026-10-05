import { describe, expect, it } from 'vitest';
import { seedEmployees } from '../../mocks/seed';
import { changedFields, EMPTY_VALUES, validate, valuesFrom } from './formModel';

const good = {
  ...EMPTY_VALUES,
  firstName: 'Lindiwe',
  lastName: 'Mahlangu',
  email: 'Lindiwe.M@Example.com',
  employeeNumber: 'EMP-0100',
  birthDate: '1994-03-02',
  salary: '61000',
  role: 'Data Analyst',
};

describe('form model', () => {
  it('gives friendly messages for empty fields', () => {
    const { data, errors } = validate(EMPTY_VALUES);
    expect(data).toBeUndefined();
    expect(errors.firstName).toBe('Enter a first name');
    expect(errors.salary).toBe('Enter a salary');
    // manager is optional so no error there
    expect(errors.managerId).toBeUndefined();
  });

  it('uses the shared rules for everything else', () => {
    const { errors } = validate({ ...good, email: 'nope', birthDate: '2999-01-01', salary: '-5' });
    expect(errors.email).toBe('Enter a valid email address');
    expect(errors.birthDate).toBe('Employees must be at least 15 years old');
    expect(errors.salary).toBe('Salary cannot be negative');
  });

  it('returns clean data when everything is fine', () => {
    const { data, errors } = validate(good);
    expect(errors).toEqual({});
    expect(data).toMatchObject({ email: 'lindiwe.m@example.com', salary: 61000, managerId: null });
  });

  it('only sends the fields that changed when editing', () => {
    const [ceo] = seedEmployees();
    if (!ceo) throw new Error('no seed data');
    const { data } = validate({ ...valuesFrom(ceo), role: 'Managing Director' });
    expect(data && changedFields(ceo, data)).toEqual({ role: 'Managing Director' });
  });
});
