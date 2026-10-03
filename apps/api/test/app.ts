import type { INestApplication } from '@nestjs/common';
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

/** resets the test database to the 14 sample people */
export async function loadSamplePeople(db: DatabaseService) {
  await db.$transaction([
    db.employee.deleteMany(),
    db.employee.createMany({ data: SAMPLE_EMPLOYEES }),
  ]);
}
