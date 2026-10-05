// loads sample employees and accounts into your local database, so the app has something to show
// run with `task db:seed`. it wipes the local employees and accounts first
//
// sample data must never reach a real database (srs constraint c-01), so this refuses to
// run unless DATABASE_URL clearly points at your own machine
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import { whyNotSafeToSeed } from '../src/database/seed-guard';
import { SAMPLE_ACCOUNTS, SAMPLE_EMPLOYEES, SAMPLE_PASSWORD } from './seed-data';

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
  const passwordHash = await hash(SAMPLE_PASSWORD);
  const byEmail = new Map(SAMPLE_EMPLOYEES.map((e) => [e.email, e.id]));
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.employee.deleteMany(),
    // managers come before their teams in the list, so every manager exists by the time it's needed
    prisma.employee.createMany({ data: SAMPLE_EMPLOYEES }),
    prisma.account.createMany({
      data: SAMPLE_ACCOUNTS.map((a) => {
        const employeeId = a.status === 'active' ? byEmail.get(a.email) : undefined;
        return {
          email: a.email,
          name: a.name,
          passwordHash,
          status: a.status,
          isAdmin: a.isAdmin,
          employeeId,
          approvedAt: a.status === 'active' ? new Date() : null,
        };
      }),
    }),
  ]);
  /* eslint-disable no-console -- this is a command line script, printing is the point */
  console.log(`Loaded ${SAMPLE_EMPLOYEES.length} sample employees into your local database.`);
  console.log(`\nSample accounts, all with the password "${SAMPLE_PASSWORD}":`);
  for (const a of SAMPLE_ACCOUNTS) {
    console.log(
      `  ${a.email.padEnd(32)} ${a.isAdmin ? 'admin' : a.status === 'pending' ? 'waiting for approval' : ''}`,
    );
  }
  /* eslint-enable no-console */
}

main()
  .catch((error: { code?: string; name?: string }) => {
    console.error(
      `Seeding failed (${error.code ?? error.name}). Is the database running and migrated? Try task db:migrate`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
