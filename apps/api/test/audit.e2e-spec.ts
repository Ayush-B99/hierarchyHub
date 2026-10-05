import { type INestApplication } from '@nestjs/common';
import type { DatabaseService } from '../src/database/database.service';
import { client, loadSamplePeople, signInAs, startApp, TEST_PASSWORD } from './app';

/**
 * the audit trail (adr 0018): every change is recorded with who, when and before and after,
 * nothing in it can be changed or deleted, and admins only see their own part of it
 */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const THANDI = id(1);
const SIPHO = id(2);
const AYESHA = id(3);
const JOHAN = id(5);
const NALEDI = id(6);
const RUAN = id(7);
const THABO = id(12);

let app: INestApplication;
let db: DatabaseService;
let started: Date;
const as = (cookie: string) => client(app, cookie);

/** a role nobody else has, so a test can find its own events among earlier ones */
const marker = () => `Role ${Math.random().toString(36).slice(2, 8)}`;

const etag = async (person: string) =>
  (await client(app).get(`/api/employees/${person}`).expect(200)).headers.etag as string;
const change = async (cookie: string, person: string, body: object) => {
  const version = await etag(person);
  return as(cookie).patch(`/api/employees/${person}`).set('If-Match', version).send(body);
};

/** events written since this test started, straight from the database */
const newEvents = () =>
  db.auditEvent.findMany({ where: { at: { gte: started } }, orderBy: { at: 'asc' } });

/** what an admin sees on the audit page */
const visibleTo = async (cookie: string, query = '') =>
  (await as(cookie).get(`/api/audit?pageSize=100${query}`).expect(200)).body.items as {
    action: string;
    subject: { employeeId: string; name: string } | null;
    actor: { name: string } | null;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    details: Record<string, unknown> | null;
  }[];

beforeAll(async () => {
  ({ app, db } = await startApp());
});
beforeEach(async () => {
  await loadSamplePeople(db);
  started = new Date();
});
afterAll(() => app.close());

describe('every change is recorded', () => {
  it('a change, with who did it and each field before and after', async () => {
    const role = marker();
    const res = await change(await signInAs(db, JOHAN), RUAN, { role, salary: 80000 });
    expect(res.status).toBe(200);

    const [event] = await newEvents();
    expect(event).toMatchObject({
      action: 'employee.updated',
      actorName: 'Johan van der Merwe',
      subjectEmployeeId: RUAN,
      subjectName: 'Ruan Botha',
      changes: { role: { from: 'Senior Engineer', to: role }, salary: { from: 76000, to: 80000 } },
    });
    // the request id matches the one in the response and the logs
    expect(event?.requestId).toBe(res.headers['x-request-id']);
  });

  it('a move, naming both managers', async () => {
    await change(await signInAs(db, SIPHO), RUAN, { managerId: NALEDI });
    const [event] = await newEvents();
    expect(event?.changes).toEqual({
      managerId: {
        from: { id: JOHAN, name: 'Johan van der Merwe' },
        to: { id: NALEDI, name: 'Naledi Khumalo' },
      },
    });
  });

  it('adding and deleting someone, and where their team went', async () => {
    const thandi = await signInAs(db, THANDI, { isAdmin: true });
    await as(thandi)
      .post('/api/employees')
      .send({
        employeeNumber: 'EMP-0500',
        firstName: 'Lindiwe',
        lastName: 'Ndlovu',
        email: 'lindiwe@example.com',
        birthDate: '1990-05-05',
        salary: 60000,
        role: 'Analyst',
        managerId: AYESHA,
      })
      .expect(201);
    const version = await etag(JOHAN);
    await as(thandi).delete(`/api/employees/${JOHAN}`).set('If-Match', version).expect(204);

    const [added, deleted] = await newEvents();
    expect(added).toMatchObject({ action: 'employee.created', subjectName: 'Lindiwe Ndlovu' });
    expect(added?.changes).toMatchObject({ salary: { from: null, to: 60000 } });
    expect(deleted).toMatchObject({
      action: 'employee.deleted',
      subjectName: 'Johan van der Merwe',
    });
    expect(deleted?.details).toMatchObject({
      teamMovedTo: { id: SIPHO, name: 'Sipho Dlamini' },
      team: expect.arrayContaining(['Ruan Botha', 'Zanele Mthembu']),
    });
  });

  it('accounts: signing up, approving, rejecting and changing access', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    const anon = client(app, null);
    for (const email of ['new1@example.com', 'new2@example.com']) {
      await anon
        .post('/api/auth/signup')
        .send({ name: 'New Person', email, password: 'a long password here' })
        .expect(202);
    }
    const [first, second] = await db.account.findMany({
      where: { status: 'pending' },
      orderBy: { email: 'asc' },
    });
    await as(sipho)
      .post(`/api/accounts/${first!.id}/approve`)
      .send({ employeeId: NALEDI })
      .expect(200);
    await as(sipho).post(`/api/accounts/${second!.id}/reject`).expect(204);
    await signInAs(db, JOHAN);
    const johanAccount = await db.account.findUniqueOrThrow({ where: { employeeId: JOHAN } });
    await as(sipho).patch(`/api/accounts/${johanAccount.id}`).send({ isAdmin: true }).expect(200);

    const actions = (await newEvents()).map((e) => e.action);
    expect(actions).toEqual([
      'account.signed_up',
      'account.signed_up',
      'account.approved',
      'account.rejected',
      'account.updated',
    ]);
  });

  it('signing in, failing, being locked out and signing out', async () => {
    await signInAs(db, RUAN);
    const anon = client(app, null);
    await anon
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'x' })
      .expect(401);
    for (let i = 0; i < 5; i += 1) {
      await anon
        .post('/api/auth/login')
        .send({ email: 'ruan.botha@example.com', password: `wrong ${i}` });
    }
    await db.account.updateMany({ where: { employeeId: RUAN }, data: { lockedUntil: null } });
    const ok = await anon
      .post('/api/auth/login')
      .send({ email: 'ruan.botha@example.com', password: TEST_PASSWORD })
      .expect(200);
    const cookie = ([] as string[]).concat(ok.headers['set-cookie'] ?? [])[0]!.split(';')[0]!;
    await as(cookie).post('/api/auth/logout').expect(204);

    const actions = (await newEvents()).map((e) => e.action);
    expect(actions).toEqual([
      'auth.sign_in_failed',
      'auth.sign_in_failed',
      'auth.sign_in_failed',
      'auth.sign_in_failed',
      'auth.sign_in_failed',
      'auth.locked',
      'auth.signed_in',
      'auth.signed_out',
    ]);
  });

  it('never records a password, its hash or a session', async () => {
    await signInAs(db, RUAN);
    const anon = client(app, null);
    await anon
      .post('/api/auth/signup')
      .send({ name: 'Secret Keeper', email: 'secret@example.com', password: 'my secret password' });
    await anon
      .post('/api/auth/login')
      .send({ email: 'ruan.botha@example.com', password: 'another secret attempt' });
    await anon
      .post('/api/auth/login')
      .send({ email: 'ruan.botha@example.com', password: TEST_PASSWORD });

    const everything = JSON.stringify(await newEvents());
    for (const secret of [
      'my secret password',
      'another secret attempt',
      TEST_PASSWORD,
      '$argon2',
      'hh_session',
    ]) {
      expect(everything).not.toContain(secret);
    }
  });
});

describe('nothing is recorded for changes that didn’t happen', () => {
  it('a refused change', async () => {
    await change(await signInAs(db, RUAN), JOHAN, { role: 'Boss' });
    expect(await newEvents()).toHaveLength(0);
  });

  it('a change made from an old version', async () => {
    const version = await etag(RUAN);
    await change(await signInAs(db, JOHAN), RUAN, { role: marker() });
    started = new Date();
    await client(app)
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', version)
      .send({ role: 'Stale' })
      .expect(412);
    expect(await newEvents()).toHaveLength(0);
  });

  it('a delete made from an old version', async () => {
    const version = await etag(RUAN);
    await change(await signInAs(db, JOHAN), RUAN, { role: marker() });
    started = new Date();
    await client(app).delete(`/api/employees/${RUAN}`).set('If-Match', version).expect(412);
    expect(await newEvents()).toHaveLength(0);
    expect(await db.employee.findUnique({ where: { id: RUAN } })).not.toBeNull();
  });

  it('a change that breaks a rule', async () => {
    // johan is in sipho's team, so this would be a reporting loop
    await change(await signInAs(db, THANDI, { isAdmin: true }), SIPHO, { managerId: JOHAN });
    expect(await newEvents()).toHaveLength(0);
  });
});

describe('history can’t be changed or deleted', () => {
  it('the api’s database user can’t update, delete or empty it', async () => {
    await change(await signInAs(db, JOHAN), RUAN, { role: marker() });
    const [event] = await newEvents();
    await expect(
      db.$executeRaw`UPDATE audit_events SET actor_name = 'Nobody' WHERE id = ${event!.id}::uuid`,
    ).rejects.toThrow();
    await expect(
      db.$executeRaw`DELETE FROM audit_events WHERE id = ${event!.id}::uuid`,
    ).rejects.toThrow();
    await expect(db.$executeRaw`TRUNCATE audit_events`).rejects.toThrow();
    expect((await db.auditEvent.findUniqueOrThrow({ where: { id: event!.id } })).actorName).toBe(
      'Johan van der Merwe',
    );
  });

  it('there’s no endpoint to change or delete it', async () => {
    const thandi = await signInAs(db, THANDI, { isAdmin: true });
    for (const method of ['post', 'patch', 'put', 'delete'] as const) {
      await as(thandi)[method]('/api/audit').expect(404);
    }
  });
});

describe('who can see what', () => {
  it('only admins can read the audit trail', async () => {
    await as(await signInAs(db, JOHAN))
      .get('/api/audit')
      .expect(403);
    await client(app, null).get('/api/audit').expect(401);
  });

  it('an admin sees their own part of the organisation, never above or beside them', async () => {
    const thandi = await signInAs(db, THANDI, { isAdmin: true });
    const ruanRole = marker();
    const thaboRole = marker();
    await change(thandi, RUAN, { role: ruanRole });
    await change(thandi, THABO, { role: thaboRole });
    await change(thandi, SIPHO, { role: marker() });

    const seen = await visibleTo(await signInAs(db, SIPHO, { isAdmin: true }));
    const roles = seen.map((e) => e.changes?.role?.to);
    expect(roles).toContain(ruanRole);
    expect(roles).not.toContain(thaboRole);
    // events about himself, he can see
    expect(
      seen.some((e) => e.subject?.employeeId === SIPHO && e.action === 'employee.updated'),
    ).toBe(true);
    // but never anything about his boss
    expect(seen.some((e) => e.subject?.employeeId === THANDI)).toBe(false);
  });

  it('so nobody learns a salary from the history that they couldn’t see anyway', async () => {
    const thandi = await signInAs(db, THANDI, { isAdmin: true });
    await change(thandi, AYESHA, { salary: 170000 });
    const seen = await visibleTo(
      await signInAs(db, SIPHO, { isAdmin: true }),
      `&employeeId=${AYESHA}`,
    );
    expect(seen).toHaveLength(0);
  });

  it('history about someone deleted is still there for the people who were above them', async () => {
    const thandi = await signInAs(db, THANDI, { isAdmin: true });
    const version = await etag(RUAN);
    await as(thandi).delete(`/api/employees/${RUAN}`).set('If-Match', version).expect(204);
    const seen = await visibleTo(
      await signInAs(db, JOHAN, { isAdmin: true }),
      `&employeeId=${RUAN}`,
    );
    expect(seen.map((e) => e.action)).toContain('employee.deleted');
  });

  it('failed sign ins for unknown emails are only for someone at the top', async () => {
    await client(app, null)
      .post('/api/auth/login')
      .send({ email: 'probe@example.com', password: 'x' })
      .expect(401);
    const sipho = await visibleTo(
      await signInAs(db, SIPHO, { isAdmin: true }),
      '&action=auth.sign_in_failed',
    );
    const thandi = await visibleTo(
      await signInAs(db, THANDI, { isAdmin: true }),
      '&action=auth.sign_in_failed',
    );
    expect(sipho.some((e) => e.details?.email === 'probe@example.com')).toBe(false);
    expect(thandi.some((e) => e.details?.email === 'probe@example.com')).toBe(true);
  });

  it('every admin sees requests for an account, like the approvals list', async () => {
    await client(app, null)
      .post('/api/auth/signup')
      .send({ name: 'Brand New', email: 'brandnew@example.com', password: 'a long password here' });
    const seen = await visibleTo(
      await signInAs(db, JOHAN, { isAdmin: true }),
      '&action=account.signed_up',
    );
    expect(seen.some((e) => e.details?.accountEmail === 'brandnew@example.com')).toBe(true);
  });

  it('filters by person and action, newest first, and refuses anything else', async () => {
    const thandi = await signInAs(db, THANDI, { isAdmin: true });
    const first = marker();
    const second = marker();
    await change(thandi, RUAN, { role: first });
    await change(thandi, RUAN, { role: second });
    const seen = await visibleTo(thandi, `&employeeId=${RUAN}&action=employee.updated`);
    expect(seen.slice(0, 2).map((e) => e.changes?.role?.to)).toEqual([second, first]);
    await as(thandi).get('/api/audit?action=employee.hacked').expect(400);
    await as(thandi).get('/api/audit?since=yesterday').expect(400);
    await as(thandi).get('/api/audit?pageSize=10000').expect(400);
  });
});
