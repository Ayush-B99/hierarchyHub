/* eslint-disable @typescript-eslint/no-require-imports */
// picks up apps/api/.env when it's there (locally), ci passes the variables in directly
// jest gives each test file its own copy of process.env, so we fill that in ourselves
// rather than using process.loadEnvFile, which would write to the wrong copy
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');

const file = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(file)) {
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, 'utf8')))) {
    // anything already set (eg by ci) wins over the file
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env first.',
  );
}
