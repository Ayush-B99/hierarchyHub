import { type INestApplication } from '@nestjs/common';
import { orgAt, type OrgChange, type OrgPerson } from '@hierarchy-hub/shared';
import type { DatabaseService } from '../src/database/database.service';
import { client, loadSamplePeople, signInAs, startApp } from './app';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const THANDI = id(1);
const AYESHA = id(3);
const JOHAN = id(5);
const NALEDI = id(6);
const RUAN = id(7);

let app: INestApplication;
let db: DatabaseService;
let started: string;

const etag = async (person: string) =>
  (await client(app).get(`/api/employees/${person}`).expect(200)).headers.etag as string;
const history = async (cookie?: string) =>
  ((await client(app, cookie).get('/api/history').expect(200)).body as OrgChange[]).filter(
    (change) => change.at >= started,
  );
const structure = async (): Promise<OrgPerson[]> =>
  ((await client(app).get('/api/employees/hierarchy').expect(200)).body as OrgPerson[]).map(
    ({ id: personId, firstName, lastName, email, employeeNumber, role, managerId }) => ({
      id: personId,
      firstName,
      lastName,
      email,
      employeeNumber,
      role,
      managerId,
    }),
  );

beforeAll(async () => {
  ({ app, db } = await startApp());
});
beforeEach(async () => {
  await loadSamplePeople(db);
  started = new Date().toISOString();
});
afterAll(() => app.close());

describe('the history of the organisation', () => {
  it('is open to everyone signed in, and nobody else', async () => {
    await client(app, await signInAs(db, RUAN))
      .get('/api/history')
      .expect(200);
    await client(app, null).get('/api/history').expect(401);
  });

  it('never includes salaries, birth dates or who made each change', async () => {
    const version = await etag(RUAN);
    await client(app)
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', version)
      .send({ role: 'Lead Engineer', salary: 99999, birthDate: '1980-01-01' })
      .expect(200);
    const changes = await history(await signInAs(db, RUAN));
    const text = JSON.stringify(changes);
    expect(changes[0]?.changes).toEqual({ role: { from: 'Senior Engineer', to: 'Lead Engineer' } });
    for (const secret of ['99999', '76000', '1980-01-01', 'salary', 'birthDate', 'Thandi Nkosi']) {
      expect(text).not.toContain(secret);
    }
  });

  it('leaves out changes with nothing structural in them', async () => {
    const version = await etag(RUAN);
    await client(app)
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', version)
      .send({ salary: 80000 })
      .expect(200);
    expect(await history()).toHaveLength(0);
  });

  it('can rebuild the organisation from before a move, an addition and a deletion', async () => {
    const before = await structure();
    const cut = new Date().toISOString();

    let version = await etag(RUAN);
    await client(app)
      .patch(`/api/employees/${RUAN}`)
      .set('If-Match', version)
      .send({ managerId: NALEDI })
      .expect(200);
    await client(app)
      .post('/api/employees')
      .send({
        employeeNumber: 'EMP-0300',
        firstName: 'Lindiwe',
        lastName: 'Ndlovu',
        email: 'lindiwe@example.com',
        birthDate: '1990-05-05',
        salary: 60000,
        role: 'Analyst',
        managerId: AYESHA,
      })
      .expect(201);
    version = await etag(JOHAN);
    await client(app).delete(`/api/employees/${JOHAN}`).set('If-Match', version).expect(204);

    const now = await structure();
    const rebuilt = orgAt(now, await history(), cut);
    const byId = (people: OrgPerson[]) => [...people].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(rebuilt)).toEqual(byId(before));
  });

  it('remembers everything about someone deleted, and who was in their team', async () => {
    const version = await etag(JOHAN);
    await client(app, await signInAs(db, THANDI, { isAdmin: true }))
      .delete(`/api/employees/${JOHAN}`)
      .set('If-Match', version)
      .expect(204);
    const [deleted] = await history();
    expect(deleted).toMatchObject({
      action: 'employee.deleted',
      employeeId: JOHAN,
      person: { firstName: 'Johan', lastName: 'van der Merwe', role: 'Engineering Manager' },
    });
    expect(deleted?.team).toEqual(expect.arrayContaining([RUAN]));
  });
});
