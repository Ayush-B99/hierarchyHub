import { whyNotSafeToSeed } from './seed-guard';

const local = 'postgresql://hh_app:pw@localhost:5432/hierarchy_hub';

describe('whyNotSafeToSeed', () => {
  it('allows the local database', () => {
    expect(whyNotSafeToSeed(local, 'development')).toBeNull();
    expect(
      whyNotSafeToSeed('postgresql://hh_app:pw@127.0.0.1:5432/hierarchy_hub_test', undefined),
    ).toBeNull();
  });

  it('refuses anything in production', () => {
    expect(whyNotSafeToSeed(local, 'production')).toMatch(/production/);
  });

  it('refuses a database on another machine, eg aws', () => {
    expect(
      whyNotSafeToSeed(
        'postgresql://hh_app:pw@hierarchy-hub.abc123.af-south-1.rds.amazonaws.com:5432/hierarchy_hub',
        'development',
      ),
    ).toMatch(/not this machine/);
  });

  it('refuses a local server with a database name we do not recognise', () => {
    expect(
      whyNotSafeToSeed('postgresql://hh_app:pw@localhost:5432/payroll', 'development'),
    ).toMatch(/not one of the local ones/);
  });

  it('refuses a missing or broken url', () => {
    expect(whyNotSafeToSeed(undefined, 'development')).toMatch(/not set/);
    expect(whyNotSafeToSeed('nonsense', 'development')).toMatch(/not a valid url/);
  });
});
