import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DatabaseService } from '../src/database/database.service';
import { client, loadSamplePeople, signInAs, startApp, TEST_PASSWORD } from './app';

const THANDI = '00000000-0000-4000-8000-000000000001';
const SIPHO = '00000000-0000-4000-8000-000000000002';
const JOHAN = '00000000-0000-4000-8000-000000000005';
const RUAN = '00000000-0000-4000-8000-000000000007';

let app: INestApplication;
let db: DatabaseService;
const anonymous = () => client(app, null);

const newcomer = {
  name: 'Amara Okafor',
  email: 'amara@example.com',
  password: 'correct horse battery',
};

const signUp = (body: object = newcomer) => anonymous().post('/api/auth/signup').send(body);
const signIn = (email: string, password: string) =>
  anonymous().post('/api/auth/login').send({ email, password });
const cookieFrom = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0]?.split(';')[0] ?? '';
const pendingId = async (email = newcomer.email) =>
  (await db.account.findUniqueOrThrow({ where: { email } })).id;

beforeAll(async () => {
  ({ app, db } = await startApp());
});
beforeEach(() => loadSamplePeople(db));
afterAll(() => app.close());

describe('you have to sign in', () => {
  it.each([
    ['list employees', 'get', '/api/employees'],
    ['load the org chart', 'get', '/api/employees/hierarchy'],
    ['add someone', 'post', '/api/employees'],
    ['change someone', 'patch', `/api/employees/${RUAN}`],
    ['delete someone', 'delete', `/api/employees/${RUAN}`],
    ['see the accounts', 'get', '/api/accounts'],
    ['ask who you are', 'get', '/api/auth/me'],
  ] as const)('to %s', async (_name, method, url) => {
    await anonymous()[method](url).expect(401);
  });

  it('but not for the health checks', async () => {
    await anonymous().get('/api/health').expect(200);
  });

  it('refuses a made up or tampered cookie', async () => {
    for (const cookie of ['hh_session=nope', `hh_session=${'A'.repeat(43)}`, 'hh_session=']) {
      await client(app, cookie).get('/api/employees').expect(401);
    }
  });
});

describe('signing up', () => {
  it('creates an account that waits for an admin, without saying anything about others', async () => {
    const res = await signUp().expect(202);
    expect(res.body.message).toMatch(/admin will check/);
    const account = await db.account.findUniqueOrThrow({ where: { email: newcomer.email } });
    expect(account).toMatchObject({ status: 'pending', isAdmin: false, employeeId: null });
    // only the argon2id hash is kept, never the password
    expect(account.passwordHash).toMatch(/^\$argon2id\$/);
    expect(account.passwordHash).not.toContain(newcomer.password);
  });

  it('gives the same answer for an email that already has an account', async () => {
    const first = await signUp().expect(202);
    const again = await signUp({ ...newcomer, name: 'Someone Else' }).expect(202);
    expect(again.body).toEqual(first.body);
    expect(await db.account.count({ where: { email: newcomer.email } })).toBe(1);
  });

  it.each([
    ['a short password', { password: 'short' }, 'password'],
    ['a password with your email name in it', { password: 'amara-is-my-password' }, 'password'],
    ['a bad email', { email: 'nope' }, 'email'],
    ['a blank name', { name: '   ' }, 'name'],
  ])('refuses %s', async (_name, changes, field) => {
    const res = await signUp({ ...newcomer, ...changes }).expect(400);
    expect(Object.keys(res.body.errors)).toContain(field);
  });

  it('refuses attempts to sign yourself up as an admin or as someone', async () => {
    await signUp({ ...newcomer, isAdmin: true }).expect(400);
    await signUp({ ...newcomer, status: 'active' }).expect(400);
    await signUp({ ...newcomer, employeeId: THANDI }).expect(400);
  });
});

describe('signing in', () => {
  it('can’t happen until an admin approves the account', async () => {
    await signUp();
    const res = await signIn(newcomer.email, newcomer.password).expect(403);
    expect(res.body.message).toMatch(/waiting for an admin/);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('works once approved, with a cookie scripts can’t read', async () => {
    await signUp();
    await client(app)
      .post(`/api/accounts/${await pendingId()}/approve`)
      .send({ employeeId: RUAN })
      .expect(200);

    const res = await signIn('  AMARA@example.com ', newcomer.password).expect(200);
    expect(res.body).toMatchObject({ name: 'Amara Okafor', isAdmin: false, employeeId: RUAN });
    const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api/);
    expect(res.headers['cache-control']).toBe('no-store');

    const me = await client(app, cookieFrom(res)).get('/api/auth/me').expect(200);
    expect(me.body.employeeId).toBe(RUAN);
  });

  it('says the same thing for a wrong password and an unknown email', async () => {
    await signInAs(db, JOHAN);
    const wrongPassword = await signIn('johan.vandermerwe@example.com', 'not the password').expect(
      401,
    );
    const unknown = await signIn('nobody@example.com', 'not the password').expect(401);
    expect(wrongPassword.body).toEqual(unknown.body);
  });

  it('locks the account after 5 wrong passwords, even for the right one', async () => {
    await signInAs(db, JOHAN);
    const email = 'johan.vandermerwe@example.com';
    for (let i = 0; i < 4; i += 1) await signIn(email, `wrong ${i}`).expect(401);
    const fifth = await signIn(email, 'wrong again').expect(429);
    expect(fifth.body.message).toMatch(/Try again in 15 minutes/);
    await signIn(email, TEST_PASSWORD).expect(429);
  });

  it('forgets earlier wrong passwords after a right one', async () => {
    await signInAs(db, JOHAN);
    const email = 'johan.vandermerwe@example.com';
    for (let i = 0; i < 4; i += 1) await signIn(email, `wrong ${i}`).expect(401);
    await signIn(email, TEST_PASSWORD).expect(200);
    await signIn(email, 'wrong again').expect(401);
  });

  it('refuses unknown fields and huge passwords without hashing them', async () => {
    await anonymous()
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x', admin: true })
      .expect(400);
    await signIn('a@b.co', 'x'.repeat(10_000)).expect(400);
  });
});

describe('signing out and losing access', () => {
  it('signing out ends the session for good', async () => {
    const cookie = await signInAs(db, JOHAN);
    await client(app, cookie).post('/api/auth/logout').expect(204);
    await client(app, cookie).get('/api/employees').expect(401);
  });

  it('a turned off account is locked out straight away', async () => {
    const cookie = await signInAs(db, JOHAN);
    await client(app, cookie).get('/api/employees').expect(200);
    await db.account.update({ where: { employeeId: JOHAN }, data: { status: 'disabled' } });
    await client(app, cookie).get('/api/employees').expect(401);
  });

  it('an expired session is refused and removed', async () => {
    const cookie = await signInAs(db, JOHAN);
    await db.session.updateMany({
      where: { account: { employeeId: JOHAN } },
      data: { createdAt: new Date(Date.now() - 10_000), expiresAt: new Date(Date.now() - 1000) },
    });
    await client(app, cookie).get('/api/employees').expect(401);
    expect(await db.session.count({ where: { account: { employeeId: JOHAN } } })).toBe(0);
  });
});

describe('approving accounts', () => {
  it('only admins can see or approve accounts', async () => {
    await signUp();
    const ruan = await signInAs(db, RUAN);
    await client(app, ruan).get('/api/accounts').expect(403);
    await client(app, ruan)
      .post(`/api/accounts/${await pendingId()}/approve`)
      .send({ employeeId: JOHAN })
      .expect(403);
  });

  it('an admin can only link accounts to people below them', async () => {
    await signUp();
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    // thandi is sipho's boss, and sipho can't approve himself twice over
    for (const employeeId of [THANDI, SIPHO]) {
      await client(app, sipho)
        .post(`/api/accounts/${await pendingId()}/approve`)
        .send({ employeeId })
        .expect(403);
    }
    await client(app, sipho)
      .post(`/api/accounts/${await pendingId()}/approve`)
      .send({ employeeId: JOHAN })
      .expect(200);
  });

  it('one employee, one account', async () => {
    await signUp();
    await signInAs(db, JOHAN);
    const res = await client(app)
      .post(`/api/accounts/${await pendingId()}/approve`)
      .send({ employeeId: JOHAN })
      .expect(409);
    expect(res.body.errors.employeeId).toBeDefined();
  });

  it('two admins approving at the same moment can’t both win', async () => {
    await signUp();
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    const id = await pendingId();
    const results = await Promise.all([
      client(app).post(`/api/accounts/${id}/approve`).send({ employeeId: RUAN }),
      client(app, sipho).post(`/api/accounts/${id}/approve`).send({ employeeId: JOHAN }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('rejecting removes the request', async () => {
    await signUp();
    await client(app)
      .post(`/api/accounts/${await pendingId()}/reject`)
      .expect(204);
    expect(await db.account.count({ where: { email: newcomer.email } })).toBe(0);
  });

  it('admins see waiting accounts and their own team’s, never those above them', async () => {
    await signUp();
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    await signInAs(db, JOHAN);
    const emails = (await client(app, sipho).get('/api/accounts').expect(200)).body.map(
      (a: { email: string }) => a.email,
    );
    expect(emails).toEqual(
      expect.arrayContaining([newcomer.email, 'johan.vandermerwe@example.com']),
    );
    expect(emails).not.toContain('thandi.nkosi@example.com');
  });
});

describe('for now, only admins can change employees', () => {
  it('someone who isn’t an admin can look but not change', async () => {
    const ruan = await signInAs(db, RUAN);
    await client(app, ruan).get('/api/employees').expect(200);
    await client(app, ruan)
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', '"v1"')
      .send({ role: 'CEO' })
      .expect(403);
  });
});

describe('other websites', () => {
  it('can’t make changes with your cookie', async () => {
    await client(app)
      .patch(`/api/employees/${RUAN}`)
      .set('Origin', 'https://evil.example')
      .set('If-Match', '"v1"')
      .send({ role: 'Hacked' })
      .expect(403);
    await client(app).post('/api/auth/logout').set('Sec-Fetch-Site', 'cross-site').expect(403);
  });

  it('the web app itself can', async () => {
    await client(app)
      .patch(`/api/employees/${RUAN}`)
      .set('Origin', 'http://localhost:5173')
      .set('If-Match', '"v1"')
      .send({ role: 'Senior Engineer' })
      .expect(200);
  });
});
