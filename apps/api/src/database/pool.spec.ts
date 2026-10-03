import { validateEnv } from '../config/env';
import { poolConfig } from './pool';

const url = 'postgresql://hh_app:pw@db.internal:5432/hierarchy_hub';

describe('poolConfig', () => {
  it('uses a plain connection locally', () => {
    const config = poolConfig(validateEnv({ DATABASE_URL: url }));
    expect(config.ssl).toBe(false);
    expect(config.max).toBe(10);
    expect(config.connectionTimeoutMillis).toBe(5000);
  });

  it('verifies the server certificate when asked to', () => {
    const env = validateEnv({
      DATABASE_URL: url,
      DATABASE_SSL: 'verify-full',
      DATABASE_SSL_CA_FILE: '/certs/rds.pem',
    });
    const config = poolConfig(env, (path) => `certificate from ${path}`);
    expect(config.ssl).toEqual({ rejectUnauthorized: true, ca: 'certificate from /certs/rds.pem' });
  });
});
