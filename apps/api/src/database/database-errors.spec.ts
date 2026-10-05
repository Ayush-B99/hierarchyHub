import { mapDatabaseError } from './database-errors';

// these are the real shapes prisma produced against postgres while building this,
// trimmed down. the integration tests check the same mappings against a live database

const checkError = (originalMessage: string) => ({
  name: 'DriverAdapterError',
  cause: { originalCode: '23514', originalMessage, kind: 'postgres', code: '23514' },
});

const knownError = (code: string, cause: object) => ({
  name: 'PrismaClientKnownRequestError',
  code,
  meta: { driverAdapterError: { cause } },
});

describe('mapDatabaseError', () => {
  it('maps the check rules to friendly messages on the right field', () => {
    expect(
      mapDatabaseError(
        checkError(
          'new row for relation "employees" violates check constraint "employees_salary_not_negative"',
        ),
      ),
    ).toMatchObject({ status: 400, field: 'salary', rule: 'employees_salary_not_negative' });
    expect(
      mapDatabaseError(
        checkError(
          'new row for relation "employees" violates check constraint "employees_not_own_manager"',
        ),
      ),
    ).toMatchObject({
      status: 400,
      field: 'managerId',
      message: "An employee can't be their own manager",
    });
  });

  it('maps the trigger rules, which come back as plain text', () => {
    expect(mapDatabaseError(checkError('this change would create a reporting loop'))).toMatchObject(
      {
        status: 400,
        field: 'managerId',
        rule: 'employees_no_reporting_loop',
      },
    );
    expect(mapDatabaseError(checkError('employees must be at least 15 years old'))).toMatchObject({
      field: 'birthDate',
    });
  });

  it('maps duplicates to 409 on the right field', () => {
    const email = knownError('P2002', { originalCode: '23505', constraint: { fields: ['email'] } });
    const number = knownError('P2002', {
      originalCode: '23505',
      constraint: { fields: ['employee_number'] },
    });
    expect(mapDatabaseError(email)).toMatchObject({ status: 409, field: 'email' });
    expect(mapDatabaseError(number)).toMatchObject({ status: 409, field: 'employeeNumber' });
  });

  it('tells deleting a manager apart from pointing at a missing one', () => {
    const deleting = knownError('P2003', {
      originalCode: '23503',
      originalMessage:
        'update or delete on table "employees" violates foreign key constraint "employees_manager_id_fkey"',
    });
    const missing = knownError('P2003', {
      originalCode: '23503',
      originalMessage:
        'insert or update on table "employees" violates foreign key constraint "employees_manager_id_fkey"',
    });
    expect(mapDatabaseError(deleting)).toMatchObject({
      status: 409,
      rule: 'employees_manager_id_fkey_delete',
    });
    expect(mapDatabaseError(missing)).toMatchObject({ status: 404, field: 'managerId' });
  });

  it('maps a missing row to 404', () => {
    expect(mapDatabaseError({ code: 'P2025' })).toMatchObject({
      status: 404,
      message: 'Employee not found',
    });
  });

  it('maps an unreachable or busy database to 503', () => {
    expect(mapDatabaseError({ code: 'P1001' })).toMatchObject({
      status: 503,
      rule: 'database_unavailable',
    });
    expect(mapDatabaseError({ cause: { kind: 'DatabaseNotReachable' } })).toMatchObject({
      status: 503,
    });
    expect(mapDatabaseError(checkError('x') && { cause: { originalCode: '57014' } })).toMatchObject(
      { rule: 'database_busy' },
    );
  });

  it('never copies the failing row into the result', () => {
    const withRow = {
      name: 'DriverAdapterError',
      cause: {
        originalCode: '23514',
        originalMessage:
          'new row for relation "employees" violates check constraint "employees_salary_not_negative"',
        detail: 'Failing row contains (..., 1990-01-01, -1.00, ...)',
      },
    };
    expect(JSON.stringify(mapDatabaseError(withRow))).not.toMatch(/Failing row|1990|-1\.00/);
  });

  it('leaves anything it does not recognise alone', () => {
    expect(mapDatabaseError(new Error('boom'))).toBeNull();
    expect(mapDatabaseError(null)).toBeNull();
  });
});
