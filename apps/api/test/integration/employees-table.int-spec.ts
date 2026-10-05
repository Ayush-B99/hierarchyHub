import { employee, ERRORS, expectDbError, insert, pool } from './db';

// these prove the database protects the data on its own, even if the api had a bug

beforeEach(async () => {
  // no action foreign key is checked at the end of the statement, so one delete clears everything
  await pool.query('delete from employees');
});

afterAll(async () => {
  await pool.end();
});

describe('new employees', () => {
  it('fills in the id, version and timestamps', async () => {
    const row = await insert(employee());
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.version).toBe(1);
    expect(row.created_at).toBeInstanceOf(Date);
    expect(row.updated_at).toBeInstanceOf(Date);
  });

  it('keeps salaries exact', async () => {
    const row = await insert(employee({ salary: '123456.78' }));
    // pg returns decimals as strings precisely so nothing gets rounded
    expect(row.salary).toBe('123456.78');
  });
});

describe('the rules', () => {
  it('nobody can manage themselves (br-01)', async () => {
    const row = await insert(employee());
    await expectDbError(
      pool.query('update employees set manager_id = id where id = $1', [row.id]),
      ERRORS.checkViolation,
      'employees_not_own_manager',
    );
  });

  it('salary cannot be negative (br-06)', async () => {
    await expectDbError(
      insert(employee({ salary: -1 })),
      ERRORS.checkViolation,
      'employees_salary_not_negative',
    );
  });

  it('salary is rounded to cents, never stored with more', async () => {
    const row = await insert(employee({ salary: '10.555' }));
    expect(row.salary).toBe('10.56');
  });

  it('employees must be at least 15 years old (br-07)', async () => {
    const yearsAgo = (years: number, days = 0) => {
      const d = new Date();
      d.setUTCFullYear(d.getUTCFullYear() - years);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    for (const birthDate of [tomorrow, yearsAgo(1), yearsAgo(15, 1)]) {
      await expectDbError(
        insert(employee({ birth_date: birthDate })),
        ERRORS.checkViolation,
        'employees_minimum_age',
      );
    }
    // exactly 15 today is fine
    await insert(employee({ birth_date: yearsAgo(15) }));
    await expectDbError(
      insert(employee({ birth_date: '1850-01-01' })),
      ERRORS.checkViolation,
      'employees_birth_date_realistic',
    );
  });

  it('names and role cannot be blank', async () => {
    await expectDbError(
      insert(employee({ first_name: '   ' })),
      ERRORS.checkViolation,
      'employees_names_not_blank',
    );
    await expectDbError(
      insert(employee({ role: '' })),
      ERRORS.checkViolation,
      'employees_names_not_blank',
    );
  });

  it('emails must be lower case and look like an email', async () => {
    await expectDbError(
      insert(employee({ email: 'Mixed@Example.com' })),
      ERRORS.checkViolation,
      'employees_email_format',
    );
    await expectDbError(
      insert(employee({ email: 'not-an-email' })),
      ERRORS.checkViolation,
      'employees_email_format',
    );
  });

  it('employee numbers must be upper case letters, numbers and dashes', async () => {
    await expectDbError(
      insert(employee({ employee_number: 'emp-1' })),
      ERRORS.checkViolation,
      'employees_number_format',
    );
    await expectDbError(
      insert(employee({ employee_number: 'EMP 1' })),
      ERRORS.checkViolation,
      'employees_number_format',
    );
  });

  it('email and employee number are unique (br-05)', async () => {
    await insert(employee({ email: 'same@example.com', employee_number: 'EMP-1' }));
    await expectDbError(
      insert(employee({ email: 'same@example.com' })),
      ERRORS.uniqueViolation,
      'employees_email_key',
    );
    await expectDbError(
      insert(employee({ employee_number: 'EMP-1' })),
      ERRORS.uniqueViolation,
      'employees_employee_number_key',
    );
  });

  it('the manager must exist', async () => {
    await expectDbError(
      insert(employee({ manager_id: '00000000-0000-4000-8000-999999999999' })),
      ERRORS.foreignKeyViolation,
      'employees_manager_id_fkey',
    );
  });
});

describe('reporting loops (br-02)', () => {
  it('refuses a direct loop, a reports to b and b reports to a', async () => {
    const a = await insert(employee());
    const b = await insert(employee({ manager_id: a.id }));
    await expectDbError(
      pool.query('update employees set manager_id = $1 where id = $2', [b.id, a.id]),
      ERRORS.checkViolation,
      'employees_no_reporting_loop',
    );
  });

  it('refuses a loop several levels deep', async () => {
    const top = await insert(employee());
    const middle = await insert(employee({ manager_id: top.id }));
    const bottom = await insert(employee({ manager_id: middle.id }));
    await expectDbError(
      pool.query('update employees set manager_id = $1 where id = $2', [bottom.id, top.id]),
      ERRORS.checkViolation,
      'employees_no_reporting_loop',
    );
  });

  it('still allows normal moves', async () => {
    const top = await insert(employee());
    const left = await insert(employee({ manager_id: top.id }));
    const right = await insert(employee({ manager_id: top.id }));
    await pool.query('update employees set manager_id = $1 where id = $2', [right.id, left.id]);
    const { rows } = await pool.query('select manager_id from employees where id = $1', [left.id]);
    expect(rows[0].manager_id).toBe(right.id);
  });

  it('stops two clashing changes made at the same moment', async () => {
    const a = await insert(employee());
    const b = await insert(employee());
    const first = await pool.connect();
    const second = await pool.connect();
    try {
      // first connection makes a report to b, but hasn't finished yet
      await first.query('begin');
      await first.query('update employees set manager_id = $1 where id = $2', [b.id, a.id]);

      // second connection tries b reports to a at the same time, it has to wait
      let secondDone = false;
      const clash = second
        .query('update employees set manager_id = $1 where id = $2', [a.id, b.id])
        .finally(() => {
          secondDone = true;
        });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(secondDone).toBe(false);

      // once the first finishes, the second sees it and is refused
      await first.query('commit');
      await expectDbError(clash, ERRORS.checkViolation, 'employees_no_reporting_loop');
    } finally {
      first.release();
      second.release();
    }

    const { rows } = await pool.query(
      'select id, manager_id from employees order by employee_number',
    );
    expect(rows.filter((r) => r.manager_id !== null)).toHaveLength(1);
  });
});

describe('deleting', () => {
  it('refuses to delete a manager while people still report to them (br-04)', async () => {
    const boss = await insert(employee());
    await insert(employee({ manager_id: boss.id }));
    await expectDbError(
      pool.query('delete from employees where id = $1', [boss.id]),
      ERRORS.foreignKeyViolation,
      'employees_manager_id_fkey',
    );
  });

  it('allows it once their team has been moved up', async () => {
    const top = await insert(employee());
    const boss = await insert(employee({ manager_id: top.id }));
    const report = await insert(employee({ manager_id: boss.id }));

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('update employees set manager_id = $1 where manager_id = $2', [
        top.id,
        boss.id,
      ]);
      await client.query('delete from employees where id = $1', [boss.id]);
      await client.query('commit');
    } finally {
      client.release();
    }

    const { rows } = await pool.query('select manager_id from employees where id = $1', [
      report.id,
    ]);
    expect(rows[0].manager_id).toBe(top.id);
  });
});

describe('versions and timestamps', () => {
  it('bumps the version and updated_at on every change', async () => {
    const row = await insert(employee());
    await new Promise((resolve) => setTimeout(resolve, 20));
    const { rows } = await pool.query(
      "update employees set role = 'Lead' where id = $1 returning *",
      [row.id],
    );
    expect(rows[0].version).toBe(2);
    expect(rows[0].updated_at.getTime()).toBeGreaterThan(row.updated_at.getTime());
  });

  it('ignores attempts to set the version, created date or id by hand', async () => {
    const row = await insert(employee());
    const { rows } = await pool.query(
      "update employees set version = 99, created_at = '2000-01-01' where id = $1 returning *",
      [row.id],
    );
    expect(rows[0].version).toBe(2);
    expect(rows[0].created_at.getTime()).toBe(row.created_at.getTime());
    await expectDbError(
      pool.query('update employees set id = gen_random_uuid() where id = $1', [row.id]),
      ERRORS.checkViolation,
      'employees_id_fixed',
    );
  });

  it('lets the api spot a clashing edit with the version', async () => {
    const row = await insert(employee());
    // someone else saves first
    await pool.query("update employees set role = 'Changed' where id = $1", [row.id]);
    // our save still thinks it's on version 1, so it matches nothing instead of overwriting
    const result = await pool.query(
      "update employees set role = 'Mine' where id = $1 and version = $2",
      [row.id, 1],
    );
    expect(result.rowCount).toBe(0);
  });
});

describe('permissions for the app user', () => {
  it('cannot change or remove the table', async () => {
    await expectDbError(pool.query('drop table employees'), ERRORS.insufficientPrivilege);
    await expectDbError(
      pool.query('alter table employees add column hacked text'),
      ERRORS.insufficientPrivilege,
    );
    await expectDbError(pool.query('truncate employees'), ERRORS.insufficientPrivilege);
  });

  it('cannot create new tables', async () => {
    await expectDbError(pool.query('create table sneaky (id int)'), ERRORS.insufficientPrivilege);
  });

  it('cannot turn off the safety trigger', async () => {
    await expectDbError(
      pool.query('alter table employees disable trigger employees_guard'),
      ERRORS.insufficientPrivilege,
    );
  });

  it('has the safety time limits set', async () => {
    const { rows } = await pool.query('show statement_timeout');
    expect(rows[0].statement_timeout).toBe('5s');
  });
});
