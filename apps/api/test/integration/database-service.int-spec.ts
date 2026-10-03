import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { mapDatabaseError } from '../../src/database/database-errors';
import { DatabaseService } from '../../src/database/database.service';

// the real prisma client against the real test database, so if prisma ever changes the
// shape of its errors these tests catch it before users get unfriendly messages

function service(
  url = process.env.TEST_DATABASE_URL as string,
  extra: Record<string, unknown> = {},
) {
  return new DatabaseService(new ConfigService({ NODE_ENV: 'test', DATABASE_URL: url, ...extra }));
}

const db = service();

const base = {
  firstName: 'Test',
  lastName: 'Person',
  birthDate: new Date('1990-01-01'),
  salary: new Prisma.Decimal(50000),
  role: 'Tester',
};
let n = 0;
const person = (overrides: Partial<Prisma.EmployeeUncheckedCreateInput> = {}) => {
  n += 1;
  return db.employee.create({
    data: { ...base, employeeNumber: `EMP-${9000 + n}`, email: `p${n}@example.com`, ...overrides },
  });
};

/** runs something that should fail, and returns what the api would send back */
async function mapped(attempt: Promise<unknown>) {
  try {
    await attempt;
  } catch (error) {
    return mapDatabaseError(error);
  }
  throw new Error('expected the database to refuse this');
}

beforeAll(() => db.onModuleInit());
beforeEach(() => db.employee.deleteMany());
afterAll(() => db.onModuleDestroy());

describe('the database service', () => {
  it('connects and reports healthy', async () => {
    expect(await db.isHealthy()).toBe(true);
  });

  it('keeps salaries exact', async () => {
    const row = await person({ salary: new Prisma.Decimal('123456.78') });
    expect(row.salary.toString()).toBe('123456.78');
  });

  it('refuses to start when the database cannot be reached, without showing the password', async () => {
    const broken = service('postgresql://hh_app:very-secret@127.0.0.1:1/hierarchy_hub_test', {
      DATABASE_CONNECT_TIMEOUT_MS: 500,
    });
    await expect(broken.onModuleInit()).rejects.toThrow(/could not connect to the database/);
    await expect(broken.onModuleInit()).rejects.not.toThrow(/very-secret/);
    expect(await broken.isHealthy()).toBe(false);
    await broken.onModuleDestroy();
  });
});

describe('real database errors become friendly api errors', () => {
  it('duplicate email', async () => {
    await person({ email: 'same@example.com' });
    expect(await mapped(person({ email: 'same@example.com' }))).toMatchObject({
      status: 409,
      field: 'email',
    });
  });

  it('duplicate employee number', async () => {
    await person({ employeeNumber: 'EMP-1' });
    expect(await mapped(person({ employeeNumber: 'EMP-1' }))).toMatchObject({
      status: 409,
      field: 'employeeNumber',
    });
  });

  it('being your own manager', async () => {
    const a = await person();
    expect(
      await mapped(db.employee.update({ where: { id: a.id }, data: { managerId: a.id } })),
    ).toMatchObject({
      status: 400,
      rule: 'employees_not_own_manager',
    });
  });

  it('a reporting loop', async () => {
    const top = await person();
    const below = await person({ managerId: top.id });
    expect(
      await mapped(db.employee.update({ where: { id: top.id }, data: { managerId: below.id } })),
    ).toMatchObject({
      status: 400,
      rule: 'employees_no_reporting_loop',
      field: 'managerId',
    });
  });

  it('a negative salary', async () => {
    const a = await person();
    expect(
      await mapped(db.employee.update({ where: { id: a.id }, data: { salary: -1 } })),
    ).toMatchObject({
      status: 400,
      field: 'salary',
    });
  });

  it('a birth date in the future', async () => {
    expect(await mapped(person({ birthDate: new Date(Date.now() + 86_400_000) }))).toMatchObject({
      status: 400,
      field: 'birthDate',
    });
  });

  it('deleting a manager who still has a team', async () => {
    const boss = await person();
    await person({ managerId: boss.id });
    expect(await mapped(db.employee.delete({ where: { id: boss.id } }))).toMatchObject({
      status: 409,
      rule: 'employees_manager_id_fkey_delete',
    });
  });

  it('a manager that does not exist', async () => {
    expect(
      await mapped(person({ managerId: '00000000-0000-4000-8000-999999999999' })),
    ).toMatchObject({
      status: 404,
      field: 'managerId',
    });
  });

  it('updating someone who is not there', async () => {
    expect(
      await mapped(
        db.employee.update({
          where: { id: '00000000-0000-4000-8000-999999999999' },
          data: { role: 'X' },
        }),
      ),
    ).toMatchObject({ status: 404 });
  });

  it('the same rules hold inside a transaction', async () => {
    const a = await person();
    expect(
      await mapped(
        db.$transaction(async (tx) =>
          tx.employee.update({ where: { id: a.id }, data: { salary: -1 } }),
        ),
      ),
    ).toMatchObject({ status: 400, field: 'salary' });
  });
});
