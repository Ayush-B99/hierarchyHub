import { type INestApplication } from '@nestjs/common';
import { LIST_SCENARIOS } from '@hierarchy-hub/shared/testing';
import request from 'supertest';
import type { DatabaseService } from '../src/database/database.service';
import { loadSamplePeople, startApp } from './app';

const JOHAN = '00000000-0000-4000-8000-000000000005';
const NOBODY = '00000000-0000-4000-8000-999999999999';

let app: INestApplication;
let db: DatabaseService;
const http = () => request(app.getHttpServer());

beforeAll(async () => {
  ({ app, db } = await startApp());
  await loadSamplePeople(db);
});

afterAll(() => app.close());

describe('GET /api/employees follows the shared contract', () => {
  // the same examples the mock api is tested with (apps/web/src/mocks/contract.test.ts)
  it.each(LIST_SCENARIOS)('$name', async ({ query, lastNames, total }) => {
    const res = await http().get('/api/employees').query(query).expect(200);
    expect(res.body.items.map((e: { lastName: string }) => e.lastName)).toEqual(lastNames);
    expect(res.body.total).toBe(total);
  });
});

describe('GET /api/employees', () => {
  it('returns employees in the contract shape', async () => {
    const res = await http().get('/api/employees').query({ search: 'johan' }).expect(200);
    expect(res.body).toEqual({
      items: [
        {
          id: JOHAN,
          employeeNumber: 'EMP-0005',
          firstName: 'Johan',
          lastName: 'van der Merwe',
          email: 'johan.vandermerwe@example.com',
          birthDate: '1986-11-17',
          salary: 98000,
          role: 'Engineering Manager',
          managerId: '00000000-0000-4000-8000-000000000002',
          version: 1,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    });
  });

  it('refuses unknown query parameters', async () => {
    const res = await http()
      .get('/api/employees')
      .query({ sortBy: 'salary', colour: 'blue' })
      .expect(400);
    expect(res.body.errors._[0]).toMatch(/colour/);
  });

  it('refuses bad values', async () => {
    const res = await http()
      .get('/api/employees')
      .query({ sortBy: 'password', pageSize: 5000, bornAfter: 'yesterday', managerId: 'nope' })
      .expect(400);
    expect(Object.keys(res.body.errors).sort()).toEqual([
      'bornAfter',
      'managerId',
      'pageSize',
      'sortBy',
    ]);
  });

  it('treats sql in the search box as plain text', async () => {
    const res = await http()
      .get('/api/employees')
      .query({ search: "'; drop table employees; --" })
      .expect(200);
    expect(res.body.total).toBe(0);
    const still = await http().get('/api/employees').expect(200);
    expect(still.body.total).toBe(14);
  });
});

describe('GET /api/employees/hierarchy', () => {
  it('returns everyone in one list', async () => {
    const res = await http().get('/api/employees/hierarchy').expect(200);
    expect(res.body).toHaveLength(14);
    expect(res.body.filter((e: { managerId: string | null }) => e.managerId === null)).toHaveLength(
      1,
    );
  });
});

describe('GET /api/employees/:id', () => {
  it('returns the employee with their version as an etag', async () => {
    const res = await http().get(`/api/employees/${JOHAN}`).expect(200);
    expect(res.body.firstName).toBe('Johan');
    expect(res.headers.etag).toBe('"v1"');
  });

  it('404s for someone who is not there', async () => {
    const res = await http().get(`/api/employees/${NOBODY}`).expect(404);
    expect(res.body).toEqual({ statusCode: 404, message: 'Employee not found' });
  });

  it('400s for something that is not an id', async () => {
    await http().get('/api/employees/not-an-id').expect(400);
  });
});

describe('caching (adr 0011)', () => {
  it('reads must be revalidated every time, nothing is served stale', async () => {
    const res = await http().get('/api/employees').expect(200);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.etag).toBeDefined();
  });

  it('answers 304 with no body when the list has not changed', async () => {
    const first = await http().get('/api/employees/hierarchy').expect(200);
    const again = await http()
      .get('/api/employees/hierarchy')
      .set('If-None-Match', first.headers.etag as string)
      .expect(304);
    expect(again.text).toBe('');
  });

  it('answers 304 for one employee until they change', async () => {
    await http().get(`/api/employees/${JOHAN}`).set('If-None-Match', '"v1"').expect(304);
    await db.employee.update({ where: { id: JOHAN }, data: { role: 'Head of Engineering' } });
    const changed = await http()
      .get(`/api/employees/${JOHAN}`)
      .set('If-None-Match', '"v1"')
      .expect(200);
    expect(changed.headers.etag).toBe('"v2"');
    await loadSamplePeople(db);
  });
});

describe('speed at the size the srs plans for (nfr-02)', () => {
  const MANY = 10_000;

  beforeAll(async () => {
    // 10,000 extra people spread over the existing managers
    const managers = [
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
      JOHAN,
    ];
    await db.employee.createMany({
      data: Array.from({ length: MANY }, (_, i) => ({
        employeeNumber: `LOAD-${i}`,
        firstName: `First${i}`,
        lastName: `Last${String(i).padStart(5, '0')}`,
        email: `load${i}@example.com`,
        birthDate: new Date(Date.UTC(1960 + (i % 40), i % 12, 1 + (i % 28))),
        salary: 20000 + (i % 200) * 1000,
        role: i % 3 === 0 ? 'Software Engineer' : 'Analyst',
        managerId: managers[i % managers.length],
      })),
    });
  });

  afterAll(() => loadSamplePeople(db));

  it.each([
    ['the first page', {}],
    ['sorted by manager', { sortBy: 'managerName', sortOrder: 'desc' }],
    [
      'a search plus filters',
      { search: 'last0', role: 'analyst', salaryMin: 50000, sortBy: 'salary' },
    ],
    ['a page deep in the list', { page: 300, pageSize: 25, sortBy: 'birthDate' }],
  ])('%s answers in under half a second', async (_label, query) => {
    // warm up once, like a real server that's been running
    await http().get('/api/employees').query(query);
    const started = performance.now();
    const res = await http().get('/api/employees').query(query).expect(200);
    const took = performance.now() - started;
    expect(res.body.total).toBeGreaterThan(0);
    expect(took).toBeLessThan(500);
  });

  it('the whole org chart for 10,000 people answers in under a second', async () => {
    const started = performance.now();
    const res = await http().get('/api/employees/hierarchy').expect(200);
    expect(res.body).toHaveLength(MANY + 14);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
