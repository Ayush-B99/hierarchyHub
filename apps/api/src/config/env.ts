import { z } from 'zod';

/**
 * environment variables are checked when the api starts, so anything missing or wrong
 * stops it straight away with a clear message instead of misbehaving later
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // --- security ---
    // how many proxies sit in front of the api (aws: cloudfront then the load balancer = 2),
    // so the real visitor's ip is used for rate limiting instead of the proxy's
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    // requests per minute from one ip address, reads and changes counted separately
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(300),
    RATE_LIMIT_WRITES_PER_MINUTE: z.coerce.number().int().min(1).default(60),

    // --- database ---
    // the app user (hh_app), never the migrator. see docs/adr/0010-database-design.md
    DATABASE_URL: z
      .string()
      .url('DATABASE_URL must be a postgresql:// url')
      .refine((url) => /^postgres(ql)?:\/\//.test(url), 'DATABASE_URL must be a postgresql:// url')
      // tls is set with DATABASE_SSL below. sslmode in the url would quietly override it
      .refine(
        (url) => !/[?&]sslmode=/i.test(url),
        'remove sslmode from DATABASE_URL and use DATABASE_SSL instead',
      ),
    // disable: plain connection, only for your own machine
    // verify-full: encrypted, and the server's certificate must check out against the ca file
    DATABASE_SSL: z.enum(['disable', 'verify-full']).default('disable'),
    // the certificate bundle to trust, eg the aws rds one. needed for verify-full
    DATABASE_SSL_CA_FILE: z.string().optional(),
    // connections per api instance. hh_app is capped at 40, so this leaves room for a few instances
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(30).default(10),
    // how long to wait for a free connection before giving up
    DATABASE_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
  })
  // in production the connection to the database has to be encrypted and verified
  .refine((env) => env.NODE_ENV !== 'production' || env.DATABASE_SSL === 'verify-full', {
    message: 'DATABASE_SSL must be verify-full in production',
    path: ['DATABASE_SSL'],
  })
  .refine((env) => env.DATABASE_SSL !== 'verify-full' || Boolean(env.DATABASE_SSL_CA_FILE), {
    message: 'DATABASE_SSL_CA_FILE is needed when DATABASE_SSL is verify-full',
    path: ['DATABASE_SSL_CA_FILE'],
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    // only the setting names and the problem, never the values, since they include passwords
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables:\n  ${problems.join('\n  ')}`);
  }
  return result.data;
}
