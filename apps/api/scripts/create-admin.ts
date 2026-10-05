// creates the first admin account on a database, or makes an existing account an admin.
// every other account is approved from inside the app, by an admin above the person, so this
// is how the person at the top gets in (adr 0016)
//
// usage: task admin:create EMPLOYEE=EMP-0001
// you're asked for a password, it never goes in your shell history or on the command line
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseEnv } from 'node:util';
import { signUpSchema } from '@hierarchy-hub/shared';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/* eslint-disable no-console -- this is a command line script, printing is the point */

if (existsSync('.env')) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync('.env', 'utf8'))))
    process.env[key] ??= value;
}

const employeeNumber = process.env.EMPLOYEE?.trim().toUpperCase();
if (!employeeNumber) {
  console.error('Say which employee the admin is, eg: task admin:create EMPLOYEE=EMP-0001');
  process.exit(1);
}

function askPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return Promise.resolve(process.env.ADMIN_PASSWORD);
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // don't echo what's typed
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => undefined;
  return new Promise((resolve) => {
    process.stdout.write('Password for the admin account: ');
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const employee = await prisma.employee.findUnique({ where: { employeeNumber } });
  if (!employee) throw new Error(`There's no employee ${employeeNumber}`);

  const name = `${employee.firstName} ${employee.lastName}`;
  const checked = signUpSchema.safeParse({
    name,
    email: employee.email,
    password: await askPassword(),
  });
  if (!checked.success) throw new Error(checked.error.issues.map((i) => i.message).join(', '));

  const data = {
    name,
    passwordHash: await hash(checked.data.password),
    status: 'active',
    isAdmin: true,
    employeeId: employee.id,
    approvedAt: new Date(),
    failedLogins: 0,
    lockedUntil: null,
  };
  await prisma.account.upsert({
    where: { email: employee.email },
    update: data,
    create: { email: employee.email, ...data },
  });
  console.log(`${name} (${employee.email}) is an admin and can sign in.`);
}

main()
  .catch((error: Error) => {
    console.error(`Couldn't create the admin: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
