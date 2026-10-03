import { type INestApplication } from '@nestjs/common';
import { WRITE_SCENARIOS } from '@hierarchy-hub/shared/testing';
import request from 'supertest';
import type { DatabaseService } from '../src/database/database.service';
import { loadSamplePeople, startApp } from './app';

const THANDI = '00000000-0000-4000-8000-000000000001';
const SIPHO = '00000000-0000-4000-8000-000000000002';
const JOHAN = '00000000-0000-4000-8000-000000000005';
const RUAN = '00000000-0000-4000-8000-000000000007';
const NOBODY = '00000000-0000-4000-8000-999999999999';

let app: INestApplication;
let db: DatabaseService;
const http = () => request(app.getHttpServer());

const newPerson = {
  employeeNumber: 'emp-0100',
  firstName: ' Lindiwe ',
  lastName: 'Mahlangu',
  email: 'Lindiwe.Mahlangu@Example.com',
  birthDate: '1994-03-02',
  salary: 61000.5,
  role: 'Data Analyst',
  managerId: SIPHO,
};

beforeAll(async () => {
  ({ app, db } = await startApp());
});
beforeEach(() => loadSamplePeople(db));
afterAll(() => app.close());

describe('changes follow the shared contract', () => {
  // the same examples the mock api is tested with (apps/web/src/mocks/contract.test.ts)
  it.each(WRITE_SCENARIOS)('$name', async ({ method, path, ifMatch, body, status, field }) => {
    let call = http()[method.toLowerCase() as 'post' | 'patch' | 'delete'](`/api${path}`);
    if (ifMatch) call = call.set('If-Match', ifMatch);
    const res = await (body ? call.send(body) : call);
    expect(res.status).toBe(status);
    if (field) expect(Object.keys(res.body.errors ?? {})).toContain(field);
  });
});

describe('POST /api/employees', () => {
  it('adds someone, tidied up, with a location and etag', async () => {
    const res = await http().post('/api/employees').send(newPerson).expect(201);
    expect(res.body).toMatchObject({
      employeeNumber: 'EMP-0100',
      firstName: 'Lindiwe',
      email: 'lindiwe.mahlangu@example.com',
      salary: 61000.5,
      managerId: SIPHO,
      version: 1,
    });
    expect(res.headers.etag).toBe('"v1"');
    expect(res.headers.location).toBe(`/api/employees/${res.body.id}`);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('lists every problem by field', async () => {
    const res = await http()
      .post('/api/employees')
      .send({ firstName: '', email: 'nope', salary: -1 })
      .expect(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(
      ['birthDate', 'email', 'employeeNumber', 'firstName', 'lastName', 'role', 'salary'].sort(),
    );
  });

  it('refuses fields the client must not set, like id or version', async () => {
    const res = await http()
      .post('/api/employees')
      .send({ ...newPerson, id: NOBODY, version: 99 })
      .expect(400);
    expect(res.body.errors._[0]).toMatch(/id|version/);
  });

  it('409s a duplicate email, ignoring capitals', async () => {
    const res = await http()
      .post('/api/employees')
      .send({ ...newPerson, email: 'THANDI.NKOSI@example.com' })
      .expect(409);
    expect(res.body.errors).toEqual({ email: ['Another employee already has that email address'] });
  });

  it('409s a duplicate employee number, ignoring capitals', async () => {
    const res = await http()
      .post('/api/employees')
      .send({ ...newPerson, employeeNumber: 'emp-0001' })
      .expect(409);
    expect(res.body.errors.employeeNumber).toBeDefined();
  });

  it('404s a manager who does not exist', async () => {
    const res = await http()
      .post('/api/employees')
      .send({ ...newPerson, managerId: NOBODY })
      .expect(404);
    expect(res.body.errors.managerId).toBeDefined();
  });
});

describe('PATCH /api/employees/:id', () => {
  it('saves a change when the version matches, and bumps it', async () => {
    const res = await http()
      .patch(`/api/employees/${JOHAN}`)
      .set('If-Match', '"v1"')
      .send({ role: 'Head of Engineering' })
      .expect(200);
    expect(res.body).toMatchObject({ role: 'Head of Engineering', version: 2, firstName: 'Johan' });
    expect(res.headers.etag).toBe('"v2"');
  });

  it('refuses with 412 when someone else saved first, and keeps their change', async () => {
    await http()
      .patch(`/api/employees/${JOHAN}`)
      .set('If-Match', '"v1"')
      .send({ role: 'First save' })
      .expect(200);
    const res = await http()
      .patch(`/api/employees/${JOHAN}`)
      .set('If-Match', '"v1"')
      .send({ role: 'Second save' })
      .expect(412);
    expect(res.body.message).toMatch(/Someone else changed this employee/);
    const now = await http().get(`/api/employees/${JOHAN}`).expect(200);
    expect(now.body.role).toBe('First save');
  });

  it('needs the If-Match header (428)', async () => {
    await http().patch(`/api/employees/${JOHAN}`).send({ role: 'X' }).expect(428);
  });

  it('accepts If-Match: * to skip the version check on purpose', async () => {
    await http()
      .patch(`/api/employees/${JOHAN}`)
      .set('If-Match', '*')
      .send({ role: 'Forced' })
      .expect(200);
  });

  it('404s someone who is not there', async () => {
    await http()
      .patch(`/api/employees/${NOBODY}`)
      .set('If-Match', '"v1"')
      .send({ role: 'X' })
      .expect(404);
  });

  it('refuses an empty change', async () => {
    const res = await http()
      .patch(`/api/employees/${JOHAN}`)
      .set('If-Match', '"v1"')
      .send({})
      .expect(400);
    expect(res.body.errors._[0]).toMatch(/at least one field/);
  });

  it('refuses being your own manager (br-01)', async () => {
    const res = await http()
      .patch(`/api/employees/${JOHAN}`)
      .set('If-Match', '"v1"')
      .send({ managerId: JOHAN })
      .expect(400);
    expect(res.body.errors.managerId[0]).toMatch(/own manager/);
  });

  it('refuses a reporting loop (br-02)', async () => {
    const res = await http()
      .patch(`/api/employees/${SIPHO}`)
      .set('If-Match', '"v1"')
      .send({ managerId: RUAN })
      .expect(400);
    expect(res.body.errors.managerId[0]).toMatch(/reports to the employee/);
  });

  it('moves someone to a new manager', async () => {
    const res = await http()
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', '"v1"')
      .send({ managerId: SIPHO })
      .expect(200);
    expect(res.body.managerId).toBe(SIPHO);
  });

  it('makes someone top level when the manager is cleared (br-03)', async () => {
    const res = await http()
      .patch(`/api/employees/${SIPHO}`)
      .set('If-Match', '"v1"')
      .send({ managerId: null })
      .expect(200);
    expect(res.body.managerId).toBeNull();
  });

  it('only one of two clashing saves wins', async () => {
    const results = await Promise.all([
      http().patch(`/api/employees/${JOHAN}`).set('If-Match', '"v1"').send({ role: 'A' }),
      http().patch(`/api/employees/${JOHAN}`).set('If-Match', '"v1"').send({ role: 'B' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 412]);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('deletes someone and moves their team up to their manager (br-04)', async () => {
    await http().delete(`/api/employees/${JOHAN}`).set('If-Match', '"v1"').expect(204);
    await http().get(`/api/employees/${JOHAN}`).expect(404);
    const team = await http().get('/api/employees').query({ managerId: SIPHO }).expect(200);
    expect(team.body.items.map((e: { lastName: string }) => e.lastName)).toEqual(
      expect.arrayContaining(['Botha', 'Molefe', 'Mthembu', 'Naidoo', 'Khumalo']),
    );
  });

  it('makes the team top level when the person deleted was at the top', async () => {
    await http().delete(`/api/employees/${THANDI}`).set('If-Match', '"v1"').expect(204);
    const roots = (await http().get('/api/employees/hierarchy')).body.filter(
      (e: { managerId: string | null }) => e.managerId === null,
    );
    expect(roots.map((e: { lastName: string }) => e.lastName).sort()).toEqual([
      'Dlamini',
      'Mokoena',
      'Patel',
    ]);
  });

  it('refuses with 412 when they changed since you loaded them', async () => {
    await http()
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', '"v1"')
      .send({ role: 'Lead' })
      .expect(200);
    await http().delete(`/api/employees/${RUAN}`).set('If-Match', '"v1"').expect(412);
    await http().get(`/api/employees/${RUAN}`).expect(200);
  });

  it('needs the If-Match header (428)', async () => {
    await http().delete(`/api/employees/${RUAN}`).expect(428);
  });

  it('404s someone who is not there', async () => {
    await http().delete(`/api/employees/${NOBODY}`).set('If-Match', '"v1"').expect(404);
  });
});
