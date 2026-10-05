import { type INestApplication } from '@nestjs/common';
import type { DatabaseService } from '../src/database/database.service';
import { client, loadSamplePeople, signInAs, startApp } from './app';

/**
 * who can see and change whom (adr 0017), tried from every position in the sample org:
 *
 *   thandi (ceo, admin)
 *   ├── sipho (cto)          ├── ayesha (cfo)       └── lerato (people)
 *   │   ├── johan (manager)  │   ├── thabo              └── bongani
 *   │   │   ├── ruan          │   └── fatima
 *   │   │   ├── zanele, kagiso, priya
 *   │   └── naledi
 *   │       └── megan
 */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const THANDI = id(1);
const SIPHO = id(2);
const AYESHA = id(3);
const JOHAN = id(5);
const NALEDI = id(6);
const RUAN = id(7);
const ZANELE = id(8);
const MEGAN = id(11);
const THABO = id(12);

let app: INestApplication;
let db: DatabaseService;
const as = (cookie: string) => client(app, cookie);

const etag = async (person: string) =>
  (await client(app).get(`/api/employees/${person}`).expect(200)).headers.etag as string;
// the version is fetched before the request is built, supertest doesn't like awaiting mid way
const change = async (cookie: string, person: string, body: object) => {
  const version = await etag(person);
  return as(cookie).patch(`/api/employees/${person}`).set('If-Match', version).send(body);
};
const remove = async (cookie: string, person: string) => {
  const version = await etag(person);
  return as(cookie).delete(`/api/employees/${person}`).set('If-Match', version);
};
const managerOf = async (person: string) =>
  (await db.employee.findUniqueOrThrow({ where: { id: person } })).managerId;

const newPerson = (managerId: string | null) => ({
  employeeNumber: `EMP-9${Math.floor(Math.random() * 999)}`,
  firstName: 'New',
  lastName: 'Person',
  email: `new${Math.floor(Math.random() * 1e6)}@example.com`,
  birthDate: '1995-01-01',
  salary: 40000,
  role: 'Tester',
  managerId,
});

beforeAll(async () => {
  ({ app, db } = await startApp());
});
beforeEach(() => loadSamplePeople(db));
afterAll(() => app.close());

describe('about yourself, only your name and email', () => {
  it('ruan can fix his own name and email', async () => {
    const ruan = await signInAs(db, RUAN);
    const res = await change(ruan, RUAN, {
      firstName: 'Ruan-Pierre',
      email: 'rp.botha@example.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Ruan-Pierre');
  });

  it.each([
    ['give himself a raise', { salary: 999999 }, 'salary'],
    ['promote himself', { role: 'Chief Executive Officer' }, 'role'],
    ['change who he reports to', { managerId: THANDI }, 'managerId'],
    ['change his employee number', { employeeNumber: 'EMP-0001X' }, 'employeeNumber'],
    ['change his birth date', { birthDate: '1980-01-01' }, 'birthDate'],
  ])('but not %s', async (_name, body, field) => {
    const ruan = await signInAs(db, RUAN);
    const res = await change(ruan, RUAN, body);
    expect(res.status).toBe(403);
    expect(res.body.errors[field]).toBeDefined();
  });

  it('a manager can’t change their own role or salary either', async () => {
    const johan = await signInAs(db, JOHAN, { isAdmin: true });
    expect((await change(johan, JOHAN, { salary: 200000 })).status).toBe(403);
  });

  it('the ceo can’t change her own salary, there’s nobody above her to', async () => {
    expect(
      (await change(await signInAs(db, THANDI, { isAdmin: true }), THANDI, { salary: 1 })).status,
    ).toBe(403);
  });
});

describe('nobody can change anyone above or beside them', () => {
  it.each([
    ['ruan changes his manager johan', () => signInAs(db, RUAN), JOHAN],
    ['ruan changes the ceo', () => signInAs(db, RUAN), THANDI],
    ['ruan changes zanele, who is beside him', () => signInAs(db, RUAN), ZANELE],
    ['johan changes naledi, who is beside him', () => signInAs(db, JOHAN), NALEDI],
    ['johan changes his boss sipho', () => signInAs(db, JOHAN), SIPHO],
    [
      'sipho, an admin, changes ayesha beside him',
      () => signInAs(db, SIPHO, { isAdmin: true }),
      AYESHA,
    ],
    [
      'sipho, an admin, changes thabo in ayesha’s team',
      () => signInAs(db, SIPHO, { isAdmin: true }),
      THABO,
    ],
  ])('%s: refused', async (_name, signIn, target) => {
    const res = await change(await signIn(), target, { role: 'Changed' });
    expect(res.status).toBe(403);
    const after = await db.employee.findUniqueOrThrow({ where: { id: target } });
    expect(after.role).not.toBe('Changed');
  });

  it('a junior can never make their boss report to them', async () => {
    const ruan = await signInAs(db, RUAN);
    expect((await change(ruan, JOHAN, { managerId: RUAN })).status).toBe(403);
    expect((await change(ruan, THANDI, { managerId: RUAN })).status).toBe(403);
    expect(await managerOf(JOHAN)).toBe(SIPHO);
    expect(await managerOf(THANDI)).toBeNull();
  });
});

describe('managers change the people below them', () => {
  it('johan, not an admin, can change anything about ruan', async () => {
    const johan = await signInAs(db, JOHAN);
    const res = await change(johan, RUAN, { role: 'Lead Engineer', salary: 80000 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: 'Lead Engineer', salary: 80000 });
  });

  it('sipho can change people two levels down', async () => {
    const sipho = await signInAs(db, SIPHO);
    expect((await change(sipho, RUAN, { role: 'Staff Engineer' })).status).toBe(200);
  });

  it('can move someone within their part of the organisation', async () => {
    const sipho = await signInAs(db, SIPHO);
    expect((await change(sipho, RUAN, { managerId: NALEDI })).status).toBe(200);
    expect(await managerOf(RUAN)).toBe(NALEDI);
    // and straight under themselves
    expect((await change(sipho, MEGAN, { managerId: SIPHO })).status).toBe(200);
  });

  it('can’t move someone out of their reach, or under someone senior', async () => {
    const johan = await signInAs(db, JOHAN);
    for (const managerId of [NALEDI, SIPHO, THANDI, AYESHA]) {
      const res = await change(johan, RUAN, { managerId });
      expect(res.status).toBe(403);
      expect(res.body.errors.managerId).toBeDefined();
    }
    expect(await managerOf(RUAN)).toBe(JOHAN);
  });

  it('only someone at the top can put people at the top', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    expect((await change(sipho, JOHAN, { managerId: null })).status).toBe(403);
    expect(
      (await change(await signInAs(db, THANDI, { isAdmin: true }), JOHAN, { managerId: null }))
        .status,
    ).toBe(200);
  });

  it('but can’t add or delete people, that’s for admins', async () => {
    const johan = await signInAs(db, JOHAN);
    await as(johan).post('/api/employees').send(newPerson(JOHAN)).expect(403);
    expect((await remove(johan, RUAN)).status).toBe(403);
  });
});

describe('admins add and delete, within their part of the organisation', () => {
  it('sipho can add people under himself or his team, but not elsewhere', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    await as(sipho).post('/api/employees').send(newPerson(SIPHO)).expect(201);
    await as(sipho).post('/api/employees').send(newPerson(JOHAN)).expect(201);
    for (const managerId of [THANDI, AYESHA, null]) {
      await as(sipho).post('/api/employees').send(newPerson(managerId)).expect(403);
    }
  });

  it('sipho can delete people below him, not beside or above', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    expect((await remove(sipho, AYESHA)).status).toBe(403);
    expect((await remove(sipho, THANDI)).status).toBe(403);
    expect((await remove(sipho, SIPHO)).status).toBe(403);
    expect((await remove(sipho, RUAN)).status).toBe(204);
  });
});

describe('salaries and birth dates', () => {
  const salaries = async (cookie: string) => {
    const people = (await as(cookie).get('/api/employees/hierarchy').expect(200)).body as {
      id: string;
      salary: number | null;
      birthDate: string | null;
    }[];
    return new Map(people.map((p) => [p.id, p]));
  };

  it('ruan sees his own, and nobody else’s', async () => {
    const seen = await salaries(await signInAs(db, RUAN));
    expect(seen.get(RUAN)).toMatchObject({ salary: 76000, birthDate: '1990-02-02' });
    for (const other of [JOHAN, ZANELE, THANDI, MEGAN]) {
      expect(seen.get(other)).toMatchObject({ salary: null, birthDate: null });
    }
  });

  it('johan sees his own and his team’s, not his boss’s or his peers’', async () => {
    const seen = await salaries(await signInAs(db, JOHAN));
    expect(seen.get(JOHAN)?.salary).toBe(98000);
    expect(seen.get(RUAN)?.salary).toBe(76000);
    expect(seen.get(SIPHO)?.salary).toBeNull();
    expect(seen.get(NALEDI)?.salary).toBeNull();
  });

  it('the ceo sees everyone’s', async () => {
    const seen = await salaries(await signInAs(db, THANDI, { isAdmin: true }));
    expect([...seen.values()].every((p) => p.salary !== null)).toBe(true);
  });

  it('being an admin doesn’t show you the salaries of people above or beside you', async () => {
    const seen = await salaries(await signInAs(db, SIPHO, { isAdmin: true }));
    expect(seen.get(THANDI)?.salary).toBeNull();
    expect(seen.get(AYESHA)?.salary).toBeNull();
    expect(seen.get(JOHAN)?.salary).toBe(98000);
  });

  it('are hidden in the list and when opening one person too', async () => {
    const ruan = await signInAs(db, RUAN);
    const list = (await as(ruan).get('/api/employees?pageSize=50').expect(200)).body.items as {
      id: string;
      salary: number | null;
    }[];
    expect(list.filter((p) => p.salary !== null).map((p) => p.id)).toEqual([RUAN]);
    const one = await as(ruan).get(`/api/employees/${THANDI}`).expect(200);
    expect(one.body).toMatchObject({ salary: null, birthDate: null });
  });

  it.each([
    ['a minimum salary', '?salaryMin=150000'],
    ['a maximum salary', '?salaryMax=50000'],
    ['a birth date range', '?bornBefore=1980-01-01'],
    ['sorting by salary', '?sortBy=salary&sortOrder=desc&pageSize=50'],
    ['sorting by birth date', '?sortBy=birthDate&pageSize=50'],
  ])('can’t be guessed with %s', async (_name, query) => {
    // ruan may only see his own, so these only ever look at him
    const ruan = await signInAs(db, RUAN);
    const res = await as(ruan).get(`/api/employees${query}`).expect(200);
    expect(res.body.items.every((p: { id: string }) => p.id === RUAN)).toBe(true);
  });

  it('filters still work across everyone you’re allowed to see', async () => {
    const johan = await signInAs(db, JOHAN);
    const res = await as(johan).get('/api/employees?salaryMin=60000').expect(200);
    expect(res.body.items.map((p: { firstName: string }) => p.firstName).sort()).toEqual([
      'Johan',
      'Ruan',
    ]);
  });

  it('other filters still search everyone', async () => {
    const ruan = await signInAs(db, RUAN);
    const res = await as(ruan).get('/api/employees?role=Software%20Engineer').expect(200);
    expect(res.body.total).toBe(2);
  });
});

describe('admins manage the accounts below them', () => {
  const accountOf = async (employeeId: string) =>
    (await db.account.findUniqueOrThrow({ where: { employeeId } })).id;

  it('sipho can make johan an admin, and turn his account off', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    const johan = await signInAs(db, JOHAN);
    await as(sipho)
      .patch(`/api/accounts/${await accountOf(JOHAN)}`)
      .send({ isAdmin: true })
      .expect(200);
    await as(johan).post('/api/employees').send(newPerson(JOHAN)).expect(201);

    await as(sipho)
      .patch(`/api/accounts/${await accountOf(JOHAN)}`)
      .send({ status: 'disabled' })
      .expect(200);
    await as(johan).get('/api/employees').expect(401);
  });

  it('nobody can change their own access, or anyone’s above or beside them', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    await signInAs(db, AYESHA);
    for (const person of [SIPHO, THANDI, AYESHA]) {
      await as(sipho)
        .patch(`/api/accounts/${await accountOf(person)}`)
        .send({ isAdmin: false })
        .expect(403);
    }
  });

  it('only admins can change accounts at all', async () => {
    const johan = await signInAs(db, JOHAN);
    await signInAs(db, RUAN);
    await as(johan)
      .patch(`/api/accounts/${await accountOf(RUAN)}`)
      .send({ isAdmin: true })
      .expect(403);
  });

  it('refuses anything else in the request', async () => {
    const sipho = await signInAs(db, SIPHO, { isAdmin: true });
    await signInAs(db, JOHAN);
    for (const body of [{}, { employeeId: THANDI }, { status: 'pending' }, { email: 'x@y.co' }]) {
      await as(sipho)
        .patch(`/api/accounts/${await accountOf(JOHAN)}`)
        .send(body)
        .expect(400);
    }
  });
});

describe('the checks can’t be raced', () => {
  it('moving someone out of your reach while you change them doesn’t let your change through', async () => {
    // johan tries to change ruan while sipho moves ruan under naledi at the same moment.
    // whichever goes first, johan's change either lands while ruan is still his, or is refused
    const johan = await signInAs(db, JOHAN);
    const sipho = await signInAs(db, SIPHO);
    const tag = await etag(RUAN);
    const [byJohan, bySipho] = await Promise.all([
      as(johan).patch(`/api/employees/${RUAN}`).set('If-Match', tag).send({ role: 'Raced' }),
      as(sipho).patch(`/api/employees/${RUAN}`).set('If-Match', tag).send({ managerId: NALEDI }),
    ]);
    // exactly one wins, the other is refused (412 for an old version, or 403 out of reach)
    expect([byJohan.status, bySipho.status].filter((s) => s === 200)).toHaveLength(1);
  });
});
