import { type INestApplication } from '@nestjs/common';
import type { DatabaseService } from '../src/database/database.service';
import { client, loadSamplePeople, startApp } from './app';

/**
 * every way we found to break the api when we went looking (docs/security/ATTACKS.md),
 * kept as tests so none of them can come back. each one must get a clear 4xx answer and
 * leave the data untouched, never a 500 and never a quiet change
 */

const THANDI = '00000000-0000-4000-8000-000000000001';
const JOHAN = '00000000-0000-4000-8000-000000000005';
const NALEDI = '00000000-0000-4000-8000-000000000006';
const RUAN = '00000000-0000-4000-8000-000000000007';

let app: INestApplication;
let db: DatabaseService;
const http = () => client(app);

let n = 0;
const person = (changes: Record<string, unknown> = {}) => {
  n += 1;
  return {
    employeeNumber: `ATK-${n}`,
    firstName: 'Test',
    lastName: 'Person',
    email: `atk${n}@example.com`,
    birthDate: '1990-01-01',
    salary: 1000,
    role: 'Tester',
    ...changes,
  };
};

const yearsAgo = (years: number, days = 0) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const count = async () => (await http().get('/api/employees').expect(200)).body.total as number;
const versionOf = async (id: string) =>
  (await http().get(`/api/employees/${id}`).expect(200)).headers.etag as string;

beforeAll(async () => {
  ({ app, db } = await startApp());
});
beforeEach(() => loadSamplePeople(db));
afterAll(() => app.close());

describe('values that make no sense are refused, not saved', () => {
  it.each([
    ['a date that does not exist', { birthDate: '1990-02-30' }, 'birthDate'],
    ['a month that does not exist', { birthDate: '1990-13-01' }, 'birthDate'],
    ['someone born yesterday', { birthDate: yearsAgo(0, -1) }, 'birthDate'],
    ['someone one day short of 15', { birthDate: yearsAgo(15, 1) }, 'birthDate'],
    ['a salary of null', { salary: null }, 'salary'],
    ['a blank salary', { salary: '' }, 'salary'],
    ['a salary of true', { salary: true }, 'salary'],
    ['a salary of Infinity as text', { salary: 'Infinity' }, 'salary'],
    ['a 300 character email', { email: `${'a'.repeat(290)}@x.com` }, 'email'],
    ['a NUL byte in a name', { firstName: 'A\u0000B' }, 'firstName'],
    ['a right to left override in a name', { lastName: 'evil\u202Etxt.exe' }, 'lastName'],
    ['a name made only of zero width spaces', { firstName: '\u200B\u200B' }, 'firstName'],
    ['a control character in a role', { role: 'Tester\u0007' }, 'role'],
  ])('%s', async (_name, changes, field) => {
    const before = await count();
    const res = await http().post('/api/employees').send(person(changes));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors ?? {})).toContain(field);
    expect(await count()).toBe(before);
  });

  it('accepts someone who turns 15 today, and real names in any language', async () => {
    await http()
      .post('/api/employees')
      .send(person({ birthDate: yearsAgo(15), firstName: 'Zoë', lastName: 'Ñúñez 李' }))
      .expect(201);
  });

  it('accepts a salary typed as text, the way a form sends it', async () => {
    const res = await http()
      .post('/api/employees')
      .send(person({ salary: '72000.50' }))
      .expect(201);
    expect(res.body.salary).toBe(72000.5);
  });

  it('stores text that looks like html or a spreadsheet formula as plain text', async () => {
    const res = await http()
      .post('/api/employees')
      .send(
        person({
          firstName: '=HYPERLINK("http://evil","x")',
          role: '<img src=x onerror=alert(1)>',
        }),
      )
      .expect(201);
    expect(res.body.role).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('the clash check can not be skipped', () => {
  it.each([
    ['"any version" (*)', '*'],
    ['a weak tag', 'W/"v1"'],
    ['two versions at once', '"v99", "v1"'],
  ])('refuses If-Match: %s', async (_name, header) => {
    await http()
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', header)
      .send({ role: 'Changed' })
      .expect(400);
    const res = await http().get(`/api/employees/${RUAN}`).expect(200);
    expect(res.body.role).not.toBe('Changed');
  });

  it('refuses a delete without the exact version too', async () => {
    await http().delete(`/api/employees/${RUAN}`).set('If-Match', '*').expect(400);
    await http().get(`/api/employees/${RUAN}`).expect(200);
  });
});

describe('the hierarchy can not be bent out of shape', () => {
  it('a junior can not become their own boss’s manager', async () => {
    const version = await versionOf(THANDI);
    const res = await http()
      .patch(`/api/employees/${THANDI}`)
      .set('If-Match', version)
      .send({ managerId: RUAN })
      .expect(400);
    expect(res.body.errors.managerId).toBeDefined();
  });

  it('two opposite moves at the same moment can not both win', async () => {
    const [johan, naledi] = [await versionOf(JOHAN), await versionOf(NALEDI)];
    const results = await Promise.all([
      http().patch(`/api/employees/${JOHAN}`).set('If-Match', johan).send({ managerId: NALEDI }),
      http().patch(`/api/employees/${NALEDI}`).set('If-Match', naledi).send({ managerId: JOHAN }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });
});

describe('odd requests get a clear answer, never a 500', () => {
  it.each([
    ['a filter date that does not exist', '?bornAfter=2026-13-45'],
    ['a minimum salary above the maximum', '?salaryMin=500000&salaryMax=1'],
    ['an earliest birth date after the latest', '?bornAfter=2000-01-01&bornBefore=1990-01-01'],
    ['a search of 10,000 characters', `?search=${'a'.repeat(10_000)}`],
    ['a NUL byte in the search', '?search=a%00b'],
    ['an absurd page number', '?page=1e308'],
    ['a parameter given twice', '?role=a&role=b'],
    ['a parameter we do not know', '?isAdmin=true'],
  ])('%s', async (_name, query) => {
    await http().get(`/api/employees${query}`).expect(400);
  });

  it('treats search wildcards as plain text', async () => {
    for (const wildcard of ['%25', '_']) {
      const res = await http().get(`/api/employees?search=${wildcard}`).expect(200);
      expect(res.body.total).toBe(0);
    }
  });

  it('refuses an object prototype hidden in the body', async () => {
    const body = JSON.stringify(person()).replace('}', ',"__proto__":{"admin":true}}');
    await http()
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(400);
  });
});
