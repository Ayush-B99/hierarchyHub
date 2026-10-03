// runs a prisma command as the migrator user instead of the everyday app user
// usage: node scripts/prisma-as.mjs <migrator|test-migrator> <prisma args...>
//
// the api itself only ever gets the app user's password, which can't change tables.
// creating and applying migrations needs the owner, so we swap DATABASE_URL just for this command
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const USERS = {
  migrator: 'MIGRATOR_DATABASE_URL',
  'test-migrator': 'TEST_MIGRATOR_DATABASE_URL',
};

const [who, ...args] = process.argv.slice(2);
const key = USERS[who];
if (!key || args.length === 0) {
  console.error('usage: node scripts/prisma-as.mjs <migrator|test-migrator> <prisma args...>');
  process.exit(1);
}

const env = { ...process.env };
// apps/api/.env locally, ci sets the variables directly and those win
if (existsSync('.env')) {
  for (const [name, value] of Object.entries(parseEnv(readFileSync('.env', 'utf8'))))
    env[name] ??= value;
}
if (!env[key]) {
  console.error(`${key} is not set. Copy apps/api/.env.example to apps/api/.env first.`);
  process.exit(1);
}
env.DATABASE_URL = env[key];

const result = spawnSync('prisma', args, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
