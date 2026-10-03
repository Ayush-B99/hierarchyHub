import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DatabaseService } from '../src/database/database.service';
import { SAMPLE_EMPLOYEES } from '../prisma/seed-data';

/** boots the whole api against the test database, set up exactly like main.ts does */
export async function startApp(): Promise<{ app: INestApplication; db: DatabaseService }> {
  // point everything at the test database, never your local one
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, { corsOrigins: ['http://localhost:5173'] });
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
