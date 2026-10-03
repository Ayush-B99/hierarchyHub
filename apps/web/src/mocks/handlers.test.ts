import { describe, expect, it } from 'vitest';
import { api, ApiError } from '../lib/api';
import { SEED_IDS } from './seed';

/** The mock API must follow the same business rules as the real one (docs/srs/SRS.md section 5). */
describe('mock API rules', () => {
  it('filters, sorts and pages the list', async () => {
    const page = await api.listEmployees({
      role: 'software engineer',
      sortBy: 'salary',
      sortOrder: 'desc',
    });
    expect(page.total).toBe(2);
    expect(page.items.map((e) => e.lastName)).toEqual(['Mthembu', 'Molefe']);
  });

  it('sorts by manager name', async () => {
    const page = await api.listEmployees({ sortBy: 'managerName', sortOrder: 'asc', pageSize: 3 });
    // thandi has no manager so she comes first, then sipho dlamini's team, ties by surname
    expect(page.items.map((e) => e.lastName)).toEqual(['Nkosi', 'Khumalo', 'van der Merwe']);
  });

  it('refuses to make someone their own manager (BR-01)', async () => {
    await expect(
      api.updateEmployee(SEED_IDS.cto, { managerId: SEED_IDS.cto }, 1),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('refuses a manager from the employee’s own team (BR-02)', async () => {
    const attempt = api.updateEmployee(SEED_IDS.cto, { managerId: SEED_IDS.seniorEngineer }, 1);
    await expect(attempt).rejects.toBeInstanceOf(ApiError);
    await expect(attempt).rejects.toMatchObject({ status: 400 });
  });

  it('moves direct reports up when a manager is deleted (BR-04)', async () => {
    await api.deleteEmployee(SEED_IDS.engineeringManager, 1);
    const team = await api.listEmployees({ managerId: SEED_IDS.cto });
    expect(team.items.map((e) => e.lastName)).toEqual(
      expect.arrayContaining(['Botha', 'Mthembu', 'Molefe', 'Naidoo', 'Khumalo']),
    );
  });

  it('rejects a duplicate email (BR-05)', async () => {
    await expect(
      api.createEmployee({
        employeeNumber: 'EMP-0999',
        firstName: 'Copy',
        lastName: 'Cat',
        email: 'thandi.nkosi@example.com',
        birthDate: '1990-01-01',
        salary: 1000,
        role: 'Tester',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('returns field errors for invalid input', async () => {
    const attempt = api.createEmployee({
      employeeNumber: '',
      firstName: '',
      lastName: 'X',
      email: 'nope',
      birthDate: '1990-01-01',
      salary: 1,
      role: 'R',
    });
    await expect(attempt).rejects.toMatchObject({ status: 400 });
    const error = (await attempt.catch((e: unknown) => e)) as ApiError;
    expect(Object.keys(error.fieldErrors)).toEqual(
      expect.arrayContaining(['employeeNumber', 'firstName', 'email']),
    );
  });
});
