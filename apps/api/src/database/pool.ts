import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';
import type { Env } from '../config/env';

/**
 * settings for the node-postgres connection pool that prisma talks through
 * kept as a plain function so it's easy to test without a database
 */
export function poolConfig(
  env: Env,
  readFile: (path: string) => string = (p) => readFileSync(p, 'utf8'),
): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    // give up waiting for a free connection rather than hanging the request
    connectionTimeoutMillis: env.DATABASE_CONNECT_TIMEOUT_MS,
    // close connections nobody has used for a while, they get reopened when needed
    idleTimeoutMillis: 30_000,
    // shows up in the database's activity view, handy when checking what's connected
    application_name: 'hierarchy-hub-api',
    ssl:
      env.DATABASE_SSL === 'verify-full'
        ? {
            // encrypted, and the server has to prove it's really our database
            rejectUnauthorized: true,
            ca: readFile(env.DATABASE_SSL_CA_FILE as string),
          }
        : false,
  };
}
