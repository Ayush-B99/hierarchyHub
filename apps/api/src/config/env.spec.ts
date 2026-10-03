import { validateEnv } from './env';

const base = { DATABASE_URL: 'postgresql://hh_app:secret-password@localhost:5432/hierarchy_hub' };

describe('validateEnv', () => {
  it('fills in safe defaults for local work', () => {
    const env = validateEnv(base);
    expect(env.DATABASE_SSL).toBe('disable');
    expect(env.DATABASE_POOL_MAX).toBe(10);
  });

  it('needs a database url', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('refuses sslmode in the url so it cannot quietly override DATABASE_SSL', () => {
    expect(() => validateEnv({ DATABASE_URL: `${base.DATABASE_URL}?sslmode=disable` })).toThrow(
      /DATABASE_SSL/,
    );
  });

  it('insists on verified encryption in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /verify-full in production/,
    );
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', DATABASE_SSL: 'verify-full' }),
    ).toThrow(/DATABASE_SSL_CA_FILE/);
    expect(
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        DATABASE_SSL: 'verify-full',
        DATABASE_SSL_CA_FILE: '/ca.pem',
      }),
    ).toMatchObject({ DATABASE_SSL: 'verify-full' });
  });

  it('never puts the password in the error message', () => {
    expect(() => validateEnv({ ...base, DATABASE_POOL_MAX: 'lots' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secret-password') }),
    );
  });
});
