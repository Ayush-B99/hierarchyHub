// loads sample employees into your local database, so the app has something to show
// run with `task db:seed`. it wipes the local employees table first
//
// sample data must never reach a real database (srs constraint c-01), so this refuses to
// run unless DATABASE_URL clearly points at your own machine
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { whyNotSafeToSeed } from '../src/database/seed-guard';
import { SAMPLE_EMPLOYEES } from './seed-data';

if (existsSync('.env')) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync('.env', 'utf8'))))
    process.env[key] ??= value;
}

const problem = whyNotSafeToSeed(process.env.DATABASE_URL, process.env.NODE_ENV);
if (problem) {
  console.error(`Not seeding: ${problem}. Sample data is only for your local database.`);
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // one transaction, so you never end up with half the sample data
  await prisma.$transaction([
    prisma.employee.deleteMany(),
    // managers come before their teams in the list, so every manager exists by the time it's needed
    prisma.employee.createMany({ data: SAMPLE_EMPLOYEES }),
  ]);
  // eslint-disable-next-line no-console -- this is a command line script, printing is the point
  console.log(`Loaded ${SAMPLE_EMPLOYEES.length} sample employees into your local database.`);
}

main()
  .catch((error: { code?: string; name?: string }) => {
    console.error(
      `Seeding failed (${error.code ?? error.name}). Is the database running and migrated? Try task db:migrate`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
