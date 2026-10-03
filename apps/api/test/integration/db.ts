import { Pool, type PoolClient } from 'pg';

/** connects as the app user, the same one the api uses, so permissions are tested too */
export const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 4 });

export interface Row {
  id?: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  salary: number | string;
  role: string;
  manager_id?: string | null;
}

let counter = 0;

/** a valid employee, override whatever the test cares about */
export function employee(overrides: Partial<Row> = {}): Row {
  counter += 1;
  return {
    employee_number: `EMP-${String(counter).padStart(4, '0')}`,
    first_name: 'Test',
    last_name: `Person ${counter}`,
    email: `person${counter}@example.com`,
    birth_date: '1990-05-01',
    salary: 50000,
    role: 'Tester',
    manager_id: null,
    ...overrides,
  };
}

/** inserts one employee and returns the full row the database stored */
export async function insert(row: Row, client: Pool | PoolClient = pool) {
  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  // column names come from our own code, never from input, values are always parameters
  const result = await client.query(
    `insert into employees (${columns.join(', ')}) values (${placeholders}) returning *`,
    values,
  );
  return result.rows[0];
}

/** checks a query failed with a specific postgres error code and, optionally, constraint */
export async function expectDbError(attempt: Promise<unknown>, code: string, constraint?: string) {
  await expect(attempt).rejects.toMatchObject(constraint ? { code, constraint } : { code });
}

export const ERRORS = {
  uniqueViolation: '23505',
  foreignKeyViolation: '23503',
  checkViolation: '23514',
  notNullViolation: '23502',
  insufficientPrivilege: '42501',
} as const;
