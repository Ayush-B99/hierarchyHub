import { createHash } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { configureApp } from '../src/app.setup';
import type { DatabaseService } from '../src/database/database.service';
import { SAMPLE_EMPLOYEES } from '../prisma/seed-data';

/**
 * boots the whole api against the test database, set up exactly like main.ts does
 *
 * pass settings to override, eg lower rate limits. nest reads its settings once, the first
 * time the app module loads, so the module is loaded here on first use (after the settings
 * are applied) rather than imported at the top. jest gives every test file its own fresh
 * modules, so put tests that need different settings in their own file
 */
export async function startApp(
  env: Record<string, string> = {},
): Promise<{ app: INestApplication; db: DatabaseService }> {
  Object.assign(process.env, {
    // high limits by default so tests don't trip the rate limiter by accident
    RATE_LIMIT_PER_MINUTE: '10000',
    RATE_LIMIT_WRITES_PER_MINUTE: '10000',
    ...env,
  });

  // never let a test touch anything but a test database
  const database = new URL(process.env.DATABASE_URL ?? 'postgresql://missing/').pathname;
  if (!database.endsWith('_test'))
    throw new Error(`refusing to run tests against ${database}, it is not a _test database`);

  /* eslint-disable @typescript-eslint/no-require-imports -- loaded on first use on purpose, see above */
  const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');
  const { DatabaseService } =
    require('../src/database/database.service') as typeof import('../src/database/database.service');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bodyParser: false });
  configureApp(app, { corsOrigins: ['http://localhost:5173'], trustProxy: 0, accessLog: false });
  await app.init();
  return { app, db: app.get(DatabaseService) };
}

const THANDI = '00000000-0000-4000-8000-000000000001';

/** a fixed session for the ceo, made fresh by loadSamplePeople, so tests can just use it */
export const CEO_COOKIE = sessionCookie('ceo-test-session-token'.padEnd(43, '0'));

/** the password every test account gets */
export const TEST_PASSWORD = 'a long test password';
let testHash: Promise<string> | undefined;
const passwordHash = () => (testHash ??= hash(TEST_PASSWORD));

function sessionCookie(token: string) {
  return `hh_session=${token}`;
}
const sessionId = (cookie: string) =>
  createHash('sha256').update(cookie.slice('hh_session='.length)).digest('hex');

/**
 * resets the test database to the 14 sample people, with one signed in account: thandi, the
 * ceo, an admin. tests that need other people signed in use signInAs
 */
export async function loadSamplePeople(db: DatabaseService) {
  await db.$transaction([
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.employee.deleteMany(),
    db.employee.createMany({ data: SAMPLE_EMPLOYEES }),
  ]);
  await signInAs(db, THANDI, { isAdmin: true, cookie: CEO_COOKIE });
}

/**
 * makes an approved account for an employee and signs it in, straight in the database, and
 * returns the cookie to send. quicker than going through the sign in form for every test
 */
export async function signInAs(
  db: DatabaseService,
  employeeId: string,
  options: { isAdmin?: boolean; cookie?: string } = {},
): Promise<string> {
  const cookie =
    options.cookie ??
    sessionCookie(
      `test-${employeeId}`
        .replace(/[^A-Za-z0-9_-]/g, '')
        .padEnd(43, '0')
        .slice(0, 43),
    );
  const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const account = await db.account.upsert({
    where: { employeeId },
    update: { isAdmin: options.isAdmin ?? false },
    create: {
      email: employee.email,
      name: `${employee.firstName} ${employee.lastName}`,
      passwordHash: await passwordHash(),
      status: 'active',
      isAdmin: options.isAdmin ?? false,
      employeeId,
      approvedAt: new Date(),
    },
  });
  await db.session.upsert({
    where: { id: sessionId(cookie) },
    update: {},
    create: {
      id: sessionId(cookie),
      accountId: account.id,
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
  return cookie;
}

/** supertest, with a session cookie on every request (the ceo's unless you say otherwise) */
export function client(app: INestApplication, cookie: string | null = CEO_COOKIE) {
  const server = app.getHttpServer();
  const signed = (test: request.Test) => (cookie ? test.set('Cookie', cookie) : test);
  return {
    get: (url: string) => signed(request(server).get(url)),
    post: (url: string) => signed(request(server).post(url)),
    patch: (url: string) => signed(request(server).patch(url)),
    put: (url: string) => signed(request(server).put(url)),
    delete: (url: string) => signed(request(server).delete(url)),
    options: (url: string) => signed(request(server).options(url)),
  };
}
