import { randomBytes } from 'node:crypto';
import { PutSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { sampleHistory } from '@hierarchy-hub/shared/testing';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { SAMPLE_ACCOUNTS, SAMPLE_EMPLOYEES } from '../prisma/seed-data';
import { validateEnv } from '../src/config/env';
import { poolConfig } from '../src/database/pool';

/* eslint-disable no-console */

const CONFIRMATION = 'load sample data';

async function main() {
  if (process.env.CONFIRM !== CONFIRMATION) {
    throw new Error(`Set CONFIRM="${CONFIRMATION}" to load the sample data`);
  }
  const secretId = process.env.SAMPLE_PASSWORDS_SECRET;
  if (!secretId) throw new Error('SAMPLE_PASSWORDS_SECRET is not set');

  const env = validateEnv(process.env);
  const pool = new Pool(poolConfig(env));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [employees, accounts] = await Promise.all([
      prisma.employee.count(),
      prisma.account.count(),
    ]);
    if (employees > 0 || accounts > 0) {
      throw new Error('The database already has people or accounts in it, so nothing was loaded');
    }

    const passwords = SAMPLE_ACCOUNTS.map((account) => ({
      ...account,
      password: randomBytes(15).toString('base64url'),
    }));
    const byEmail = new Map(SAMPLE_EMPLOYEES.map((e) => [e.email, e.id]));
    const accountRows = await Promise.all(
      passwords.map(async (a) => ({
        email: a.email,
        name: a.name,
        passwordHash: await hash(a.password),
        status: a.status,
        isAdmin: a.isAdmin,
        employeeId: a.status === 'active' ? byEmail.get(a.email) : undefined,
        approvedAt: a.status === 'active' ? new Date() : null,
      })),
    );

    await prisma.$transaction([
      prisma.employee.createMany({ data: SAMPLE_EMPLOYEES }),
      prisma.account.createMany({ data: accountRows }),
      prisma.auditEvent.createMany({
        data: sampleHistory().map((event) => ({
          at: event.at,
          action: event.action,
          actorEmployeeId: event.actor.employeeId,
          actorName: event.actor.name,
          subjectEmployeeId: event.subjectEmployeeId,
          subjectName: event.subjectName,
          scope: event.scope,
          changes: event.changes as Prisma.InputJsonValue,
          details: event.details as Prisma.InputJsonValue,
        })),
      }),
    ]);

    await new SecretsManagerClient({}).send(
      new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: JSON.stringify(
          passwords.map(({ email, password, status, isAdmin }) => ({
            email,
            password,
            status,
            isAdmin,
          })),
          null,
          2,
        ),
      }),
    );

    console.log(
      `Loaded ${SAMPLE_EMPLOYEES.length} people, ${passwords.length} accounts and the sample history.`,
    );
    console.log('The account passwords are in Secrets Manager. Run: task aws:passwords');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: Error) => {
  console.error(`Nothing was loaded: ${error.message}`);
  process.exitCode = 1;
});
